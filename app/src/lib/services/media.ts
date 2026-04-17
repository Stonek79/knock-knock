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
     * Единая точка входа для получения медиа (Проверка кэша -> Загрузка -> Расшифровка).
     */
    ensureMedia: async (
        params: GetMediaParams,
    ): Promise<Result<ProcessedMediaData, AppError<string>>> => {
        const { id, userId, roomKey, isVault } = params;

        // 1. Пытаемся взять из кэша
        const cached = await mediaService.getMedia({ id, userId });
        if (
            cached.isOk() &&
            (cached.value.original || cached.value.thumbnail)
        ) {
            return ok(cached.value);
        }

        // 2. Если в кэше нет, запрашиваем запись из репозитория
        const recordResult = await mediaRepository.getMediaRecord(id);
        if (recordResult.isErr()) {
            return err(recordResult.error);
        }

        // 3. Скачиваем и кэшируем
        return mediaService.downloadAndCache({
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

            const { original, thumbnail, metadata } = workerData;

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
            const cacheItem: MediaCacheItem = {
                [MEDIA_CACHE_FIELDS.ID]: record.id,
                [MEDIA_CACHE_FIELDS.OWNER_ID]: userId,
                [MEDIA_CACHE_FIELDS.BLOB]: original,
                [MEDIA_CACHE_FIELDS.THUMBNAIL]: thumbnail,
                [MEDIA_CACHE_FIELDS.METADATA]: {
                    name: originalName,
                    size: original.size,
                    mimeType: file.type,
                    ...metadata,
                },
                [MEDIA_CACHE_FIELDS.REFERENCES]: [
                    {
                        type: MEDIA_REFERENCE_TYPES.MESSAGE,
                        id: roomId,
                        addedAt: Date.now(),
                    },
                ],
                [MEDIA_CACHE_FIELDS.SYNC_STATUS]: MEDIA_SYNC_STATUS.SYNCED,
                [MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT]: Date.now(),
                [MEDIA_CACHE_FIELDS.CREATED_AT]: Date.now(),
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
                original: item[MEDIA_CACHE_FIELDS.BLOB],
                thumbnail: item[MEDIA_CACHE_FIELDS.THUMBNAIL] || null,
            });
        }

        return ok({ original: null, thumbnail: null });
    },

    /**
     * Скачивание и расшифровка.
     */
    downloadAndCache: async (
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
            // 1. Скачивание оригинала
            const originalUrl = mediaRepository.getFileUrl({
                record,
                filename: record[MEDIA_FIELDS.FILE],
            });
            const originalResp = await fetch(originalUrl);
            if (!originalResp.ok) {
                return err(
                    appError(
                        ERROR_CODES.DOWNLOAD_ERROR,
                        MEDIA_ERROR_MESSAGES.DOWNLOAD_FAIL(originalResp.status),
                    ),
                );
            }
            const encryptedBlob = await originalResp.blob();

            // 2. Расшифровка через воркер
            const decryptResult = await mediaWorkerClient.postTask({
                taskId: crypto.randomUUID(),
                action: MEDIA_WORKER_ACTIONS.DECRYPT_BLOB,
                payload: encryptedBlob,
                cryptoKey: roomKey,
            });

            const decryptedOriginal = decryptResult.original;

            // 3. Обработка превью
            let decryptedThumbnail: Blob | null = null;
            if (record[MEDIA_FIELDS.THUMBNAIL]) {
                const thumbUrl = mediaRepository.getFileUrl({
                    record,
                    filename: record[MEDIA_FIELDS.THUMBNAIL],
                });
                const thumbResp = await fetch(thumbUrl);
                if (thumbResp.ok) {
                    const encThumb = await thumbResp.blob();
                    const thumbDecrypt = await mediaWorkerClient.postTask({
                        taskId: crypto.randomUUID(),
                        action: MEDIA_WORKER_ACTIONS.DECRYPT_BLOB,
                        payload: encThumb,
                        cryptoKey: roomKey,
                    });
                    decryptedThumbnail = thumbDecrypt.original;
                }
            }

            // 4. Кеширование
            const cacheItem: MediaCacheItem = {
                [MEDIA_CACHE_FIELDS.ID]: record.id,
                [MEDIA_CACHE_FIELDS.OWNER_ID]: userId,
                [MEDIA_CACHE_FIELDS.BLOB]: decryptedOriginal,
                [MEDIA_CACHE_FIELDS.THUMBNAIL]: decryptedThumbnail || undefined,
                [MEDIA_CACHE_FIELDS.METADATA]: {
                    name: record[MEDIA_FIELDS.FILE],
                    size: decryptedOriginal.size,
                    mimeType: record[MEDIA_FIELDS.MIME_TYPE],
                },
                [MEDIA_CACHE_FIELDS.REFERENCES]: [],
                [MEDIA_CACHE_FIELDS.SYNC_STATUS]: MEDIA_SYNC_STATUS.SYNCED,
                [MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT]: Date.now(),
                [MEDIA_CACHE_FIELDS.CREATED_AT]: Date.now(),
            };

            await mediaDb.put({ item: cacheItem, userId });

            return ok({
                original: decryptedOriginal,
                thumbnail: decryptedThumbnail,
            });
        } catch (error) {
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    error instanceof Error
                        ? error.message
                        : "Ошибка при расшифровке",
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
