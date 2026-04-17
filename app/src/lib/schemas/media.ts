import { z } from "zod";
import {
    ATTACHMENT_TYPES,
    DEFAULT_MIME_TYPES,
    MEDIA_CACHE_FIELDS,
    MEDIA_FIELDS,
    MEDIA_LIMITS,
    MEDIA_REFERENCE_TYPES,
    MEDIA_SYNC_STATUS,
    MEDIA_WORKER_ACTIONS,
    MIME_PREFIXES,
} from "@/lib/constants";

/**
 * Валидация Blob/File
 */
const blobSchema = z.custom<Blob | File>(
    (val) => val instanceof Blob || val instanceof File,
    { message: "validation.fileTypeInvalid" },
);

/**
 * Схема метаданных медиа (хранится в JSON в БД)
 */
export const mediaMetadataSchema = z
    .object({
        width: z.number().optional(),
        height: z.number().optional(),
        duration: z.number().optional(),
        name: z.string().optional(),
        size: z.number().optional(),
        mimeType: z.string().optional(),
    })
    .catchall(z.unknown());

/**
 * Валидация отдельного файла перед загрузкой
 */
export const mediaFileSchema = blobSchema.superRefine((file, ctx) => {
    const sizeMB = file.size / (1024 * 1024);
    const mime = file.type || DEFAULT_MIME_TYPES.OCTET_STREAM;

    const addSizeError = (maxSize: number) => {
        ctx.addIssue({
            code: "custom",
            message: JSON.stringify({
                key: "validation.fileTooLarge",
                max: maxSize,
            }),
        });
    };

    if (
        mime.startsWith(MIME_PREFIXES.IMAGE) &&
        sizeMB > MEDIA_LIMITS.MAX_IMAGE_SIZE_MB
    ) {
        addSizeError(MEDIA_LIMITS.MAX_IMAGE_SIZE_MB);
    } else if (
        mime.startsWith(MIME_PREFIXES.VIDEO) &&
        sizeMB > MEDIA_LIMITS.MAX_VIDEO_SIZE_MB
    ) {
        addSizeError(MEDIA_LIMITS.MAX_VIDEO_SIZE_MB);
    } else if (
        mime.startsWith(MIME_PREFIXES.AUDIO) &&
        sizeMB > MEDIA_LIMITS.MAX_AUDIO_SIZE_MB
    ) {
        addSizeError(MEDIA_LIMITS.MAX_AUDIO_SIZE_MB);
    } else if (sizeMB > MEDIA_LIMITS.MAX_DOCUMENT_SIZE_MB) {
        addSizeError(MEDIA_LIMITS.MAX_DOCUMENT_SIZE_MB);
    }
});

/**
 * Базовая схема записи медиа (PocketBase MediaRecord)
 * Основана на MEDIA_FIELDS
 */
export const mediaSchema = z.object({
    [MEDIA_FIELDS.ID]: z.string(),
    [MEDIA_FIELDS.FILE]: z.string(),
    [MEDIA_FIELDS.CREATED_BY]: z.string(),
    [MEDIA_FIELDS.TYPE]: z.enum([
        ATTACHMENT_TYPES.IMAGE,
        ATTACHMENT_TYPES.VIDEO,
        ATTACHMENT_TYPES.AUDIO,
        ATTACHMENT_TYPES.DOCUMENT,
    ]),
    [MEDIA_FIELDS.SIZE]: z.number(),
    [MEDIA_FIELDS.MIME_TYPE]: z.string(),
    [MEDIA_FIELDS.METADATA]: mediaMetadataSchema.optional(),
    [MEDIA_FIELDS.THUMBNAIL]: z.string().optional(),
    [MEDIA_FIELDS.IS_VAULT]: z.boolean().default(false),
    [MEDIA_FIELDS.REFERENCES]: z.record(z.string(), z.unknown()).optional(),
    [MEDIA_FIELDS.CREATED]: z.string(),
    [MEDIA_FIELDS.UPDATED]: z.string(),
});

/**
 * Схема ссылки на медиа (внутри кэша)
 */
export const mediaReferenceSchema = z.object({
    type: z.enum([
        MEDIA_REFERENCE_TYPES.MESSAGE,
        MEDIA_REFERENCE_TYPES.FAVORITE,
        MEDIA_REFERENCE_TYPES.ROOM_AVATAR,
    ]),
    id: z.string(),
    addedAt: z.number(),
});

/**
 * Схема записи в локальном кэше (Dexie)
 * Расширяет базовую схему медиа
 */
export const mediaCacheSchema = z.object({
    [MEDIA_CACHE_FIELDS.ID]: z.string(),
    [MEDIA_CACHE_FIELDS.BLOB]: blobSchema,
    [MEDIA_CACHE_FIELDS.THUMBNAIL]: blobSchema.optional(),
    [MEDIA_CACHE_FIELDS.METADATA]: mediaMetadataSchema,
    [MEDIA_CACHE_FIELDS.REFERENCES]: z.array(mediaReferenceSchema),
    [MEDIA_CACHE_FIELDS.SYNC_STATUS]: z.enum([
        MEDIA_SYNC_STATUS.SYNCED,
        MEDIA_SYNC_STATUS.PENDING,
        MEDIA_SYNC_STATUS.LOCAL_ONLY,
    ]),
    [MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT]: z.number(),
    [MEDIA_CACHE_FIELDS.CREATED_AT]: z.number(),
    [MEDIA_CACHE_FIELDS.OWNER_ID]: z.string(),
});

/**
 * Схемы для Web Worker
 */
export const mediaWorkerActionSchema = z.enum([
    MEDIA_WORKER_ACTIONS.COMPRESS_IMAGE,
    MEDIA_WORKER_ACTIONS.MUX_VIDEO,
    MEDIA_WORKER_ACTIONS.ENCRYPT_BLOB,
    MEDIA_WORKER_ACTIONS.DECRYPT_BLOB,
]);

export const mediaWorkerTaskSchema = z.object({
    taskId: z.string(),
    action: mediaWorkerActionSchema,
    payload: z.custom<Blob | File | ArrayBuffer>(
        (val) =>
            val instanceof Blob ||
            val instanceof ArrayBuffer ||
            val instanceof File,
        { message: "validation.invalidFormat" },
    ),
    cryptoKey: z.custom<CryptoKey>((val) => typeof val === "object").optional(),
    options: z
        .object({
            userId: z.string().optional(),
            roomId: z.string().optional(),
            originalName: z.string().optional(),
            isVault: z.boolean().optional(),
        })
        .optional(),
});

export const mediaWorkerPayloadSchema = z.object({
    original: blobSchema,
    thumbnail: blobSchema.optional(),
    metadata: mediaMetadataSchema.optional(),
});

export const mediaWorkerResponseSchema = z.object({
    taskId: z.string(),
    success: z.boolean(),
    data: mediaWorkerPayloadSchema.optional(),
    error: z.string().optional(),
});
