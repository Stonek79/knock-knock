/**
 * Константы для чат-функционала.
 */

/** Ключи локального хранилища для чата */
export const STORAGE_KEYS = {
    CHAT_LAST_VIEWED: "chat_last_viewed",
} as const;

/** Позиция сообщения в группе */
export const MESSAGE_POSITION = {
    SINGLE: "single",
    START: "start",
    MIDDLE: "middle",
    END: "end",
} as const;

/** События реалтайма */
export const REALTIME_EVENTS = {
    INSERT: "INSERT",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
} as const;

/** Настройки индикатора печати */
export const TYPING_CONFIG = {
    TIMEOUT_MS: 3000,
    CHANNEL_PREFIX: "typing:",
} as const;

/** Типы вложений */
export const ATTACHMENT_TYPES = {
    IMAGE: "image",
    VIDEO: "video",
    AUDIO: "audio",
    DOCUMENT: "document",
} as const;

/** Дефолтные значения для медиафайлов */
export const MEDIA_DEFAULTS = {
    /** Метка голосового сообщения (ключ для i18n) */
    VOICE_MESSAGE_LABEL: "voice_message",
    /** Фоллбэк-имя файла, если имя не определено */
    FALLBACK_FILE_NAME: "file",
} as const;
