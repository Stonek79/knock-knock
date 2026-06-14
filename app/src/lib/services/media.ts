import {
    ATTACHMENT_TYPES,
    COMPRESSION_OPTIONS,
    ERROR_CODES,
    MEDIA_CACHE_FIELDS,
    MEDIA_ERROR_MESSAGES,
    MEDIA_FIELDS,
    MEDIA_FILE_PREFIXES,
    MEDIA_LIMITS,
    MEDIA_REFERENCE_TYPES,
    MEDIA_SYNC_STATUS,
    MEDIA_SYSTEM_CONSTANTS,
    MEDIA_WORKER_ACTIONS,
    MIME_PREFIXES,
} from "../constants";
import { logger } from "../logger";
import { mediaDb } from "../mediadb/media-db";
import { mediaRepository } from "../repositories/media.repository";
import { mediaMetadataSchema } from "../schemas/media";
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
 * СЕРВИС ОРКЕСТРАЦИИ МЕДИА
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

/**
 * Генерирует превью-изображение первого кадра видео (на отметке 0.5с) и извлекает его физические размеры.
 */
const generateVideoThumbnail = (
    file: Blob,
): Promise<{ blob: Blob; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "auto";
        video.playsInline = true;
        video.muted = true;

        // Временное добавление в DOM для активации декодирования в Safari
        video.style.position = "fixed";
        video.style.top = "0";
        video.style.left = "0";
        video.style.width = "1px";
        video.style.height = "1px";
        video.style.opacity = "0";
        video.style.pointerEvents = "none";
        document.body.appendChild(video);

        let isCompleted = false;

        const cleanup = () => {
            if (isCompleted) {
                return;
            }
            isCompleted = true;
            clearTimeout(timeoutId);
            if (video.parentNode) {
                video.parentNode.removeChild(video);
            }
            try {
                URL.revokeObjectURL(video.src);
            } catch {
                // Игнорируем ошибку при очистке
            }
        };

        // Защитный таймаут на 3 секунды
        const timeoutId = setTimeout(() => {
            cleanup();
            reject(
                new Error("Превышен таймаут ожидания создания превью видео"),
            );
        }, 3000);

        const objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;

        video.onloadeddata = () => {
            video.currentTime = 0.5; // Смещение, чтобы первый кадр не был черным
        };

        video.onseeked = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(
                        (blob) => {
                            cleanup();
                            if (blob) {
                                resolve({
                                    blob,
                                    width: video.videoWidth,
                                    height: video.videoHeight,
                                });
                            } else {
                                reject(
                                    new Error(
                                        "Не удалось создать Blob из Canvas",
                                    ),
                                );
                            }
                        },
                        COMPRESSION_OPTIONS.FORMAT_WEBP,
                        COMPRESSION_OPTIONS.THUMB_QUALITY,
                    );
                } else {
                    cleanup();
                    reject(new Error("Не удалось получить 2D контекст Canvas"));
                }
            } catch (e) {
                cleanup();
                reject(e);
            }
        };

        video.onerror = (e) => {
            cleanup();
            reject(
                e instanceof ErrorEvent
                    ? e.error
                    : new Error("Ошибка загрузки видео при создании превью"),
            );
        };

        // Запускаем принудительную загрузку видео
        video.load();
    });
};

let hasCleanedUp = false;

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
            type === ATTACHMENT_TYPES.DOCUMENT ||
            type === ATTACHMENT_TYPES.VIDEO
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
            const fileType = file.type;
            const fileSizeMB = file.size / (1024 * 1024);

            if (fileType.startsWith(MIME_PREFIXES.IMAGE)) {
                if (fileSizeMB > MEDIA_LIMITS.MAX_IMAGE_SIZE_MB) {
                    return err(
                        appError(
                            ERROR_CODES.VALIDATION_ERROR,
                            MEDIA_ERROR_MESSAGES.LIMIT_IMAGE_SIZE(
                                MEDIA_LIMITS.MAX_IMAGE_SIZE_MB,
                            ),
                        ),
                    );
                }
            } else if (fileType.startsWith(MIME_PREFIXES.VIDEO)) {
                if (fileSizeMB > MEDIA_LIMITS.MAX_VIDEO_SIZE_MB) {
                    return err(
                        appError(
                            ERROR_CODES.VALIDATION_ERROR,
                            MEDIA_ERROR_MESSAGES.LIMIT_VIDEO_SIZE(
                                MEDIA_LIMITS.MAX_VIDEO_SIZE_MB,
                            ),
                        ),
                    );
                }
            } else if (fileType.startsWith(MIME_PREFIXES.AUDIO)) {
                if (fileSizeMB > MEDIA_LIMITS.MAX_AUDIO_SIZE_MB) {
                    return err(
                        appError(
                            ERROR_CODES.VALIDATION_ERROR,
                            `Аудиофайл слишком большой (макс. ${MEDIA_LIMITS.MAX_AUDIO_SIZE_MB}МБ)`,
                        ),
                    );
                }
            } else {
                if (fileSizeMB > MEDIA_LIMITS.MAX_DOCUMENT_SIZE_MB) {
                    return err(
                        appError(
                            ERROR_CODES.VALIDATION_ERROR,
                            `Документ слишком большой (макс. ${MEDIA_LIMITS.MAX_DOCUMENT_SIZE_MB}МБ)`,
                        ),
                    );
                }
            }

            // Генерируем превью видео, если это видео
            let localThumbnail: Blob | null = null;
            let videoWidth: number | undefined;
            let videoHeight: number | undefined;

            if (file.type.startsWith(MIME_PREFIXES.VIDEO)) {
                try {
                    const thumbResult = await generateVideoThumbnail(file);
                    localThumbnail = thumbResult.blob;
                    videoWidth = thumbResult.width;
                    videoHeight = thumbResult.height;
                } catch (e) {
                    logger.warn("Не удалось сгенерировать превью для видео", e);
                }
            }

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

            // Шифруем сгенерированное превью видео в воркере
            let encryptedThumb: Blob | undefined = thumbnail;
            if (localThumbnail) {
                const thumbData = await mediaWorkerClient.postTask({
                    taskId: crypto.randomUUID(),
                    action: MEDIA_WORKER_ACTIONS.ENCRYPT_BLOB,
                    payload: localThumbnail,
                    cryptoKey,
                });
                encryptedThumb = thumbData.original;
            }

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

            if (encryptedThumb) {
                const thumbPrefix = isVault
                    ? MEDIA_FILE_PREFIXES.VAULT_THUMB
                    : MEDIA_FILE_PREFIXES.THUMBNAIL;
                formData.append(
                    MEDIA_FIELDS.THUMBNAIL,
                    new File(
                        [encryptedThumb],
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

            // Объединяем метаданные от воркера и метаданные видео
            const safeMetadata = {
                ...(metadata || {}),
                ...(videoWidth
                    ? { width: videoWidth, height: videoHeight }
                    : {}),
            };

            const safeMetadataFiltered = Object.fromEntries(
                Object.entries(safeMetadata).filter(
                    ([_, v]) => v !== undefined,
                ),
            );

            if (Object.keys(safeMetadataFiltered).length > 0) {
                formData.append(
                    MEDIA_FIELDS.METADATA,
                    JSON.stringify(safeMetadataFiltered),
                );
            }

            // 3. Загрузка через репозиторий
            const uploadResult = await mediaRepository.uploadMedia(formData);
            if (uploadResult.isErr()) {
                return err(uploadResult.error);
            }

            const record = uploadResult.value;

            // 4. Кеширование в IndexedDB
            const finalCacheBlob = plainOriginal
                ? new Blob([plainOriginal], { type: plainOriginal.type })
                : new Blob([file], { type: file.type });
            const finalCacheThumb =
                localThumbnail ||
                (plainThumbnail
                    ? new Blob([plainThumbnail], { type: plainThumbnail.type })
                    : null);

            const cacheItem: MediaCacheItem = {
                [MEDIA_CACHE_FIELDS.ID]: record.id,
                [MEDIA_CACHE_FIELDS.OWNER_ID]: userId,
                [MEDIA_CACHE_FIELDS.BLOB]: finalCacheBlob,
                [MEDIA_CACHE_FIELDS.THUMBNAIL]: finalCacheThumb,
                [MEDIA_CACHE_FIELDS.METADATA]: {
                    name: originalName,
                    size: original.size,
                    mimeType: file.type,
                    ...safeMetadataFiltered,
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

        // Запуск фоновой очистки старого кэша раз за сессию
        if (!hasCleanedUp) {
            hasCleanedUp = true;
            mediaDb
                .cleanupExpiredCache({
                    userId,
                    ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 дней
                })
                .catch((e) => {
                    logger.error("Ошибка при фоновой очистке кэша медиа", e);
                });
        }

        const cachedResult = await fromPromise(
            mediaDb.getWithAccessUpdate({ id, userId }),
            (e) => appError(ERROR_CODES.DB_ERROR, "Ошибка чтения из кеша", e),
        );

        if (cachedResult.isOk() && cachedResult.value) {
            const item = cachedResult.value;
            return ok({
                original: item[MEDIA_CACHE_FIELDS.BLOB] || null,
                thumbnail: item[MEDIA_CACHE_FIELDS.THUMBNAIL] || null,
                metadata: item[MEDIA_CACHE_FIELDS.METADATA] || null,
            });
        }

        return ok({ original: null, thumbnail: null, metadata: null });
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
                const parsedMetadata = mediaMetadataSchema.safeParse(
                    record[MEDIA_FIELDS.METADATA],
                );
                return ok({
                    original: null,
                    thumbnail: null,
                    metadata: parsedMetadata.success
                        ? parsedMetadata.data
                        : null,
                });
            }

            const thumbField = record[MEDIA_FIELDS.THUMBNAIL];
            const thumbFilename = Array.isArray(thumbField)
                ? thumbField[0]
                : thumbField;

            const thumbUrl = mediaRepository.getFileUrl({
                record,
                filename: thumbFilename,
            });
            const thumbDownloadResult =
                await mediaRepository.downloadFile(thumbUrl);
            if (thumbDownloadResult.isErr()) {
                return err(
                    appError(
                        ERROR_CODES.DOWNLOAD_ERROR,
                        thumbDownloadResult.error.message ||
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

            // Обходим баг Safari с IndexedDB, перечитывая Blob из Web Worker'а в ArrayBuffer на главном потоке
            const thumbBuffer = await thumbDecrypt.original.arrayBuffer();
            const cleanThumb = new Blob([thumbBuffer], {
                type:
                    thumbDecrypt.original.type ||
                    COMPRESSION_OPTIONS.FORMAT_WEBP,
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
                        [MEDIA_CACHE_FIELDS.THUMBNAIL]: cleanThumb,
                    },
                });
            } else {
                const cacheItem = mediaService._createCacheItem(
                    record,
                    userId,
                    null,
                    cleanThumb,
                );
                await mediaDb.put({ item: cacheItem, userId });
            }

            const parsedMetadata = mediaMetadataSchema.safeParse(
                record[MEDIA_FIELDS.METADATA],
            );
            return ok({
                original: null,
                thumbnail: cleanThumb,
                metadata: parsedMetadata.success ? parsedMetadata.data : null,
            });
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
            const fileField = record[MEDIA_FIELDS.FILE];
            const fileFilename = Array.isArray(fileField)
                ? fileField[0]
                : fileField;

            const originalUrl = mediaRepository.getFileUrl({
                record,
                filename: fileFilename,
            });
            const originalDownloadResult =
                await mediaRepository.downloadFile(originalUrl);
            if (originalDownloadResult.isErr()) {
                return err(
                    appError(
                        ERROR_CODES.DOWNLOAD_ERROR,
                        originalDownloadResult.error.message ||
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

            // Обходим баг Safari с IndexedDB, перечитывая Blob из Web Worker'а в ArrayBuffer на главном потоке
            const originalBuffer = await decryptResult.original.arrayBuffer();
            const originalMime = record[MEDIA_FIELDS.MIME_TYPE] || "";
            const typedOriginalBlob = new Blob([originalBuffer], {
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

            const parsedMetadata = mediaMetadataSchema.safeParse(
                record[MEDIA_FIELDS.METADATA],
            );
            return ok({
                original: typedOriginalBlob,
                thumbnail: existing?.thumbnail || null,
                metadata: parsedMetadata.success ? parsedMetadata.data : null,
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
    getFileUrl: (
        record: MediaResponse,
        filename: string | string[],
    ): string => {
        const actualFilename = Array.isArray(filename) ? filename[0] : filename;
        return mediaRepository.getFileUrl({ record, filename: actualFilename });
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
