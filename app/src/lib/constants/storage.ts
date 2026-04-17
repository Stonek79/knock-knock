/** Настройки хранилища файлов */
export const STORAGE_CONFIG = {
    AVATARS_COLLECTION: "users",
    MEDIA_COLLECTION: "media",
} as const;

/** Префиксы MIME-типов для определения категории файла */
export const MIME_PREFIXES = {
    IMAGE: "image/",
    VIDEO: "video/",
    AUDIO: "audio/",
    DOCUMENT: "application/",
} as const;

/** Дефолтные MIME-типы и расширения */
export const DEFAULT_MIME_TYPES = {
    OCTET_STREAM: "application/octet-stream",
    WEBM_AUDIO: "audio/webm",
    WEBP: "image/webp",
    BIN_EXT: ".bin",
} as const;

/** Префиксы имен файлов для медиа */
export const MEDIA_FILE_PREFIXES = {
    ENCRYPTED: "enc_",
    THUMBNAIL: "thumb_",
    VAULT: "vault_",
    VAULT_THUMB: "vthumb_",
} as const;

/** Типы связей медиа-файлов */
export const MEDIA_REFERENCE_TYPES = {
    MESSAGE: "message",
    FAVORITE: "favorite",
    ROOM_AVATAR: "room_avatar",
} as const;

/** Статусы синхронизации для локального кэша */
export const MEDIA_SYNC_STATUS = {
    SYNCED: "synced",
    PENDING: "pending",
    LOCAL_ONLY: "local-only",
} as const;

/** Сообщения об ошибках медиа-системы */
export const MEDIA_ERROR_MESSAGES = {
    LIMIT_IMAGE_SIZE: (max: number) =>
        `Изображение слишком большое (макс. ${max}МБ)`,
    LIMIT_VIDEO_SIZE: (max: number) => `Видео слишком большое (макс. ${max}МБ)`,
    UNSUPPORTED_BROWSER:
        "Браузер не поддерживает необходимые технологии безопасности",
    WORKER_INIT_FAIL: "Не удалось инициализировать медиа-воркер",
    WORKER_PROCESS_FAIL: "Ошибка обработки файла в воркере",
    UPLOAD_FAIL: "Ошибка при загрузке медиафайла на сервер",
    DOWNLOAD_FAIL: (status: number) =>
        `Ошибка загрузки файла с сервера (статус: ${status})`,
    DECRYPT_FAIL: "Ошибка расшифровки данных",
    MISSING_KEY: "Ключ для расшифровки не предоставлен",
    IDENTITY_KEY_NOT_FOUND: "Мастер-ключ пользователя (Identity) не найден",
    FILE_NOT_FOUND_CACHE: "Файл не найден в локальном кеше",
    UNAUTHORIZED: "Пользователь не авторизован для работы с медиа",
} as const;

/** Лимиты медиафайлов */
export const MEDIA_LIMITS = {
    MAX_IMAGE_SIZE_MB: 10,
    MAX_VIDEO_SIZE_MB: 30,
    MAX_AUDIO_SIZE_MB: 15,
    MAX_DOCUMENT_SIZE_MB: 50,
    MAX_ATTACHMENTS: 10,
} as const;

/** Настройки сжатия изображений */
export const COMPRESSION_OPTIONS = {
    MAX_SIZE_MB: 5,
    MAX_WIDTH_OR_HEIGHT: 1500,
    QUALITY: 0.8,
    THUMB_WIDTH_OR_HEIGHT: 800,
    THUMB_QUALITY: 0.6,
    FORMAT_WEBP: "image/webp",
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

/** Константы для магических строк и значений в аудиоплеере */
export const AUDIO_PLAYER_CONSTANTS = {
    /** Префикс для blob: URL (незашифрованные данные) */
    BLOB_PREFIX: "blob:",
    /** Префикс для data: URL (inline данные) */
    DATA_PREFIX: "data:",
    /** Значение по умолчанию для времени при ошибке/NaN */
    DEFAULT_TIME: "0:00",
    /** Разделитель для отображения времени (текущее / общее) */
    TIME_SEPARATOR: " / ",
} as const;

/** Действия Media Worker */
export const MEDIA_WORKER_ACTIONS = {
    COMPRESS_IMAGE: "COMPRESS_IMAGE",
    MUX_VIDEO: "MUX_VIDEO",
    ENCRYPT_BLOB: "ENCRYPT_BLOB",
    DECRYPT_BLOB: "DECRYPT_BLOB",
} as const;

/** Системные константы медиа-системы */
export const MEDIA_SYSTEM_CONSTANTS = {
    WORKER_NAME: "media-processor",
    CANVAS_CONTEXT_2D: "2d",
    DEFAULT_ATTACHMENT_NAME: "attachment.bin",
} as const;
