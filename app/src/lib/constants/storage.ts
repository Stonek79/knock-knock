/** Названия бакетов Supabase Storage */
export const STORAGE_BUCKETS = {
    CHAT_MEDIA: "chat_media",
    CHAT_AUDIO: "chat_audio",
} as const;

/** Типы медиа-вложений */
export const ATTACHMENT_TYPES = {
    IMAGE: "image",
    VIDEO: "video",
    AUDIO: "audio",
    DOCUMENT: "document",
} as const;

/** Префиксы MIME-типов для определения категории файла */
export const MIME_PREFIXES = {
    IMAGE: "image/",
    VIDEO: "video/",
    AUDIO: "audio/",
} as const;

/** Дефолтные MIME-типы */
export const DEFAULT_MIME_TYPES = {
    OCTET_STREAM: "application/octet-stream",
    WEBM_AUDIO: "audio/webm",
} as const;
