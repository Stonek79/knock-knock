import {
    ATTACHMENT_TYPES,
    COMPRESSION_OPTIONS,
    ERROR_CODES,
    MEDIA_CACHE_FIELDS,
    MEDIA_ERROR_MESSAGES,
    MEDIA_FIELDS,
    MEDIA_FILE_PREFIXES,
    MEDIA_REFERENCE_TYPES,
    MEDIA_SYNC_STATUS,
    MEDIA_SYSTEM_CONSTANTS,
    MEDIA_WORKER_ACTIONS,
    MIME_PREFIXES,
} from "../constants";
import { logger } from "../logger";
import { mediaDb } from "../mediadb/media-db";
import { mediaRepository } from "../repositories/media.repository";
import type {
    AppError,
    AttachmentType,
    MediaCacheItem,
    MediaResponse,
    MediaUploadParams,
    ProcessedMediaData,
} from "../types";
import { appError, err, fromPromise, ok, type Result } from "../utils/result";
import { mediaWorkerClient } from "../workers/media.client";

/**
 * СЕРВИС ОРКЕСТРАЦИИ МЕДИА (Media Vault v3)
 */

type GetMediaParams = {
    id: string;
    userId: string;
    roomKey?: CryptoKey;
    isVault?: boolean;
};

type DownloadParams = {
    record: MediaResponse;
    userId: string;
    roomKey?: CryptoKey;
    isVault?: boolean;
};

export const mediaService = {
    /**
     * Получение превью для ленты сообщений.
     * Умная логика: если файл Аудио или Документ, качаем оригинал.
     */
    ensureThumbnail: async (
        params: GetMediaParams,
    ): Promise<Result<ProcessedMediaData, AppError<string>>> => {
        const { id, userId, roomKey, isVault } = params;

        // 1. Проверяем кэш
        const cached = await mediaService.getMedia({ id, userId });
        if (
            cached.isOk() &&
            (cached.value.thumbnail || cached.value.original)
        ) {
            return ok(cached.value);
        }

        // 2. Нет в кэше, запрашиваем запись
        const recordResult = await mediaRepository.getMediaRecord(id);
        if (recordResult.isErr()) {
            return err(recordResult.error);
        }
        const record = recordResult.value;

        // 3. Умная логика
        const type = record[MEDIA_FIELDS.TYPE];
        if (
            type === ATTACHMENT_TYPES.AUDIO ||
            type === ATTACHMENT_TYPES.DOCUMENT
        ) {
            return mediaService.ensureOriginal(params);
        }

        // 4. Скачиваем только превью
        return mediaService._downloadAndCacheThumbnail({
            record,
            userId,
            roomKey,
            isVault,
        });
    },

    /**
     * Получение оригинального файла по клику.
     */
    ensureOriginal: async (
        params: GetMediaParams,
    ): Promise<Result<ProcessedMediaData, AppError<string>>> => {
        const { id, userId, roomKey, isVault } = params;

        const cached = await mediaService.getMedia({ id, userId });
        if (cached.isOk() && cached.value.original) {
            return ok(cached.value);
        }

        const recordResult = await mediaRepository.getMediaRecord(id);
        if (recordResult.isErr()) {
            return err(recordResult.error);
        }

        return mediaService._downloadAndCacheOriginal({
            record: recordResult.value,
            userId,
            roomKey,
            isVault,
        });
    },

    /**
     * Загрузка и шифрование нового медиафайла.
     * @param params - Параметры загрузки (файл, ключи, метаданные)
     * @returns Результат загрузки с данными записи PocketBase
     */
    uploadMedia: async (
        params: MediaUploadParams,
    ): Promise<Result<MediaResponse, AppError<string>>> => {
        const { file, userId, roomId, cryptoKey, isVault = false } = params;

        try {
            // 1. Выбор действия воркера (сжатие, шифрование или просто шифрование)
            const action = file.type.startsWith(MIME_PREFIXES.IMAGE)
                ? MEDIA_WORKER_ACTIONS.COMPRESS_IMAGE
                : file.type.startsWith(MIME_PREFIXES.VIDEO)
                  ? MEDIA_WORKER_ACTIONS.MUX_VIDEO
                  : MEDIA_WORKER_ACTIONS.ENCRYPT_BLOB;

            const workerData = await mediaWorkerClient.postTask({
                taskId: crypto.randomUUID(),
                action,
                payload: file,
                cryptoKey,
            });

            const {
                original,
                thumbnail,
                plainOriginal,
                plainThumbnail,
                metadata,
            } = workerData;

            // 2. Подготовка FormData через константы
            const formData = new FormData();
            const originalName =
                file instanceof File
                    ? file.name
                    : MEDIA_SYSTEM_CONSTANTS.DEFAULT_ATTACHMENT_NAME;
            const prefix = isVault
                ? MEDIA_FILE_PREFIXES.VAULT
                : MEDIA_FILE_PREFIXES.ENCRYPTED;

            formData.append(
                MEDIA_FIELDS.FILE,
                new File([original], `${prefix}${originalName}`, {
                    type: file.type,
                }),
            );

            if (thumbnail) {
                const thumbPrefix = isVault
                    ? MEDIA_FILE_PREFIXES.VAULT_THUMB
                    : MEDIA_FILE_PREFIXES.THUMBNAIL;
                formData.append(
                    MEDIA_FIELDS.THUMBNAIL,
                    new File(
                        [thumbnail],
                        `${thumbPrefix}${originalName}.webp`,
                        {
                            type: COMPRESSION_OPTIONS.FORMAT_WEBP,
                        },
                    ),
                );
            }

            formData.append(MEDIA_FIELDS.CREATED_BY, userId);
            formData.append(
                MEDIA_FIELDS.TYPE,
                mediaService._getFileType(file.type),
            );
            formData.append(MEDIA_FIELDS.SIZE, original.size.toString());
            formData.append(MEDIA_FIELDS.MIME_TYPE, file.type);
            formData.append(MEDIA_FIELDS.IS_VAULT, isVault.toString());
            formData.append(
                MEDIA_FIELDS.REFERENCES,
                JSON.stringify({ roomId }),
            );

            if (metadata) {
                formData.append(
                    MEDIA_FIELDS.METADATA,
                    JSON.stringify(metadata),
                );
            }

            // 3. Загрузка через репозиторий
            const uploadResult = await mediaRepository.uploadMedia(formData);
            if (uploadResult.isErr()) {
                return err(uploadResult.error);
            }

            const record = uploadResult.value;

            // 4. Кеширование в IndexedDB
            const safeMetadata = metadata
                ? Object.fromEntries(
                      Object.entries(metadata).filter(
                          ([_, v]) => v !== undefined,
                      ),
                  )
                : {};

            const finalCacheBlob = plainOriginal || file;
            const finalCacheThumb = plainThumbnail || null;

            const cacheItem: MediaCacheItem = {
                [MEDIA_CACHE_FIELDS.ID]: record.id,
                [MEDIA_CACHE_FIELDS.OWNER_ID]: userId,
                [MEDIA_CACHE_FIELDS.BLOB]: finalCacheBlob,
                [MEDIA_CACHE_FIELDS.THUMBNAIL]: finalCacheThumb,
                [MEDIA_CACHE_FIELDS.METADATA]: {
                    name: originalName,
                    size: original.size,
                    mimeType: file.type,
                    ...safeMetadata,
                },
                [MEDIA_CACHE_FIELDS.REFERENCES]: [
                    {
                        type: MEDIA_REFERENCE_TYPES.MESSAGE,
                        id: roomId,
                        roomId,
                        addedAt: Date.now(),
                    },
                ],
                [MEDIA_CACHE_FIELDS.SYNC_STATUS]: MEDIA_SYNC_STATUS.SYNCED,
                [MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT]: Date.now(),
                [MEDIA_CACHE_FIELDS.CREATED_AT]: Date.now(),
                [MEDIA_CACHE_FIELDS.ROOM_ID]: roomId,
            };

            await fromPromise(mediaDb.put({ item: cacheItem, userId }), (e) =>
                appError(ERROR_CODES.DB_ERROR, "Ошибка кеширования медиа", e),
            );

            return ok(record);
        } catch (error) {
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    error instanceof Error
                        ? error.message
                        : "Ошибка обработки медиа",
                ),
            );
        }
    },

    /**
     * Получение из кэша.
     */
    getMedia: async (
        params: Pick<GetMediaParams, "id" | "userId">,
    ): Promise<Result<ProcessedMediaData, AppError<string>>> => {
        const { id, userId } = params;

        const cachedResult = await fromPromise(
            mediaDb.getWithAccessUpdate({ id, userId }),
            (e) => appError(ERROR_CODES.DB_ERROR, "Ошибка чтения из кеша", e),
        );

        if (cachedResult.isOk() && cachedResult.value) {
            const item = cachedResult.value;
            return ok({
                original: item[MEDIA_CACHE_FIELDS.BLOB] || null,
                thumbnail: item[MEDIA_CACHE_FIELDS.THUMBNAIL] || null,
            });
        }

        return ok({ original: null, thumbnail: null });
    },

    /**
     * Вспомогательный метод для создания объекта кэша.
     */
    _createCacheItem: (
        record: MediaResponse,
        userId: string,
        original: Blob | null,
        thumbnail: Blob | null,
    ): MediaCacheItem => {
        const remoteRefs = record[MEDIA_FIELDS.REFERENCES] as {
            roomId?: string;
        } | null;
        const roomId = remoteRefs?.roomId;

        const recordMetadata = record[MEDIA_FIELDS.METADATA];
        const safeMetadata = recordMetadata
            ? Object.fromEntries(
                  Object.entries(recordMetadata).filter(
                      ([_, v]) => v !== undefined,
                  ),
              )
            : {};

        return {
            [MEDIA_CACHE_FIELDS.ID]: record.id,
            [MEDIA_CACHE_FIELDS.OWNER_ID]: userId,
            [MEDIA_CACHE_FIELDS.BLOB]: original,
            [MEDIA_CACHE_FIELDS.THUMBNAIL]: thumbnail,
            [MEDIA_CACHE_FIELDS.METADATA]: {
                name: record[MEDIA_FIELDS.FILE],
                size: original?.size || record[MEDIA_FIELDS.SIZE] || 0,
                mimeType: record[MEDIA_FIELDS.MIME_TYPE],
                ...safeMetadata,
            },
            [MEDIA_CACHE_FIELDS.REFERENCES]: roomId
                ? [
                      {
                          type: MEDIA_REFERENCE_TYPES.MESSAGE,
                          id: roomId,
                          roomId,
                          addedAt: Date.now(),
                      },
                  ]
                : [],
            [MEDIA_CACHE_FIELDS.SYNC_STATUS]: MEDIA_SYNC_STATUS.SYNCED,
            [MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT]: Date.now(),
            [MEDIA_CACHE_FIELDS.CREATED_AT]: Date.now(),
            [MEDIA_CACHE_FIELDS.ROOM_ID]: roomId,
        };
    },

    /**
     * Скачивание и расшифровка только превью.
     */
    _downloadAndCacheThumbnail: async (
        params: DownloadParams,
    ): Promise<Result<ProcessedMediaData, AppError<string>>> => {
        const { record, userId, roomKey, isVault } = params;

        if (!roomKey && !isVault) {
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    MEDIA_ERROR_MESSAGES.MISSING_KEY,
                ),
            );
        }

        try {
            if (!record[MEDIA_FIELDS.THUMBNAIL]) {
                return ok({ original: null, thumbnail: null });
            }

            const thumbUrl = mediaRepository.getFileUrl({
                record,
                filename: record[MEDIA_FIELDS.THUMBNAIL],
            });
            const thumbDownloadResult =
                await mediaRepository.downloadFile(thumbUrl);
            if (thumbDownloadResult.isErr()) {
                return err(
                    appError(
                        ERROR_CODES.DOWNLOAD_ERROR,
                        MEDIA_ERROR_MESSAGES.DOWNLOAD_FAIL(500),
                    ),
                );
            }

            const thumbDecrypt = await mediaWorkerClient.postTask({
                taskId: crypto.randomUUID(),
                action: MEDIA_WORKER_ACTIONS.DECRYPT_BLOB,
                payload: thumbDownloadResult.value,
                cryptoKey: roomKey,
            });

            const existing = await mediaDb.getWithAccessUpdate({
                id: record.id,
                userId,
            });
            if (existing) {
                await mediaDb.update({
                    id: record.id,
                    userId,
                    changes: {
                        [MEDIA_CACHE_FIELDS.THUMBNAIL]: thumbDecrypt.original,
                    },
                });
            } else {
                const cacheItem = mediaService._createCacheItem(
                    record,
                    userId,
                    null,
                    thumbDecrypt.original,
                );
                await mediaDb.put({ item: cacheItem, userId });
            }

            return ok({ original: null, thumbnail: thumbDecrypt.original });
        } catch (error) {
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    error instanceof Error
                        ? error.message
                        : "Ошибка при расшифровке превью",
                ),
            );
        }
    },

    /**
     * Скачивание и расшифровка оригинала.
     */
    _downloadAndCacheOriginal: async (
        params: DownloadParams,
    ): Promise<Result<ProcessedMediaData, AppError<string>>> => {
        const { record, userId, roomKey, isVault } = params;

        if (!roomKey && !isVault) {
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    MEDIA_ERROR_MESSAGES.MISSING_KEY,
                ),
            );
        }

        try {
            const originalUrl = mediaRepository.getFileUrl({
                record,
                filename: record[MEDIA_FIELDS.FILE],
            });
            const originalDownloadResult =
                await mediaRepository.downloadFile(originalUrl);
            if (originalDownloadResult.isErr()) {
                return err(
                    appError(
                        ERROR_CODES.DOWNLOAD_ERROR,
                        MEDIA_ERROR_MESSAGES.DOWNLOAD_FAIL(500),
                    ),
                );
            }

            const decryptResult = await mediaWorkerClient.postTask({
                taskId: crypto.randomUUID(),
                action: MEDIA_WORKER_ACTIONS.DECRYPT_BLOB,
                payload: originalDownloadResult.value,
                cryptoKey: roomKey,
            });

            const originalMime = record[MEDIA_FIELDS.MIME_TYPE] || "";
            const typedOriginalBlob = new Blob([decryptResult.original], {
                type: originalMime,
            });

            const existing = await mediaDb.getWithAccessUpdate({
                id: record.id,
                userId,
            });
            if (existing) {
                await mediaDb.update({
                    id: record.id,
                    userId,
                    changes: {
                        [MEDIA_CACHE_FIELDS.BLOB]: typedOriginalBlob,
                        [MEDIA_CACHE_FIELDS.METADATA]: {
                            ...existing[MEDIA_CACHE_FIELDS.METADATA],
                            size: typedOriginalBlob.size,
                        },
                    },
                });
            } else {
                const cacheItem = mediaService._createCacheItem(
                    record,
                    userId,
                    typedOriginalBlob,
                    null,
                );
                await mediaDb.put({ item: cacheItem, userId });
            }

            return ok({
                original: typedOriginalBlob,
                thumbnail: existing?.thumbnail || null,
            });
        } catch (error) {
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    error instanceof Error
                        ? error.message
                        : "Ошибка при расшифровке оригинала",
                ),
            );
        }
    },

    /**
     * Получение URL файла для записи.
     * Используется для формирования объектов Attachment.
     * @param record - Запись из PocketBase
     * @param filename - Имя файла
     * @returns Прямой URL к файлу на сервере
     */
    getFileUrl: (record: MediaResponse, filename: string): string => {
        return mediaRepository.getFileUrl({ record, filename });
    },

    /**
     * Удаление медиа-записи из облака и локального кэша.
     */
    deleteMedia: async (
        params: Pick<GetMediaParams, "id" | "userId">,
    ): Promise<Result<void, AppError<string>>> => {
        const { id, userId } = params;

        // Удаляем из локального IndexedDB
        try {
            await mediaDb.delete({ id, userId });
        } catch (e) {
            // Ошибка в IndexedDB не должна блокировать удаление из облака
            logger.warn("Не удалось удалить медиа из локального кэша", {
                id,
                error: e,
            });
        }

        // Удаляем физически из облака
        const deleteResult = await mediaRepository.deleteMediaRecord(id);
        if (deleteResult.isErr()) {
            return err(
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось удалить файл из облака",
                    deleteResult.error,
                ),
            );
        }

        return ok(undefined);
    },

    /**
     * Определение типа медиа на основе MIME-типа.
     * @param mime - MIME-тип файла
     * @returns Тип вложения (IMAGE, VIDEO, etc.)
     * @private
     */
    _getFileType: (mime: string): AttachmentType => {
        if (mime.startsWith(MIME_PREFIXES.IMAGE)) {
            return ATTACHMENT_TYPES.IMAGE;
        }
        if (mime.startsWith(MIME_PREFIXES.VIDEO)) {
            return ATTACHMENT_TYPES.VIDEO;
        }
        if (mime.startsWith(MIME_PREFIXES.AUDIO)) {
            return ATTACHMENT_TYPES.AUDIO;
        }
        return ATTACHMENT_TYPES.DOCUMENT;
    },
};
