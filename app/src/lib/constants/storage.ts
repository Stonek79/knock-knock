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

/** Лимиты медиафайлов */
export const MEDIA_LIMITS = {
    MAX_VIDEO_SIZE_MB: 30,
    MAX_ATTACHMENTS: 10,
} as const;

/** Настройки сжатия изображений */
export const COMPRESSION_OPTIONS = {
    MAX_SIZE_MB: 5,
    MAX_WIDTH_OR_HEIGHT: 1500,
} as const;

/** Лимиты записи аудио */
export const RECORDING_LIMITS = {
    MAX_DURATION_SECONDS: 30,
    WARNING_THRESHOLD_SECONDS: 25,
    /** Задержка перед остановкой записи для захвата хвоста речи (мс) */
    STOP_DELAY_MS: 1000,
    /** Интервал сбора данных MediaRecorder (мс) */
    DATA_TIMESLICE_MS: 250,
    /** Интервал таймера обратного отсчёта (мс) */
    TIMER_INTERVAL_MS: 1000,
} as const;

/** Настройки аудиоплеера */
export const AUDIO_PLAYER = {
    /** Шаг перемотки слайдера (сек) */
    SEEK_STEP: 0.1,
    /** Fallback для max слайдера, если длительность неизвестна */
    FALLBACK_DURATION: 100,
    /** Значение для Chrome WebM duration workaround */
    SEEK_TO_END_VALUE: 1e10,
} as const;
