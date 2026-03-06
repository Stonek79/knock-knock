/**
 * Константы для кэширования в IndexedDB
 */
export const CACHE_CONSTANTS = {
    DB_NAME: "knock-media-db",
    STORE_NAME: "media-cache",
    LOG_PREFIX: "[MediaCache]",
} as const;

/**
 * Протокол для моковых URL в режиме разработки
 */
export const MOCK_STORAGE_PROTOCOL = "mock-storage://";
