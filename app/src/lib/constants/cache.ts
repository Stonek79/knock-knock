/**
 * Константы для кэширования в IndexedDB
 */
export const CACHE_CONSTANTS = {
    DB_NAME: "nemo-media-db",
    STORE_NAME: "media-cache",
    LOG_PREFIX: "[MediaCache]",
} as const;

/**
 * Протокол для моковых URL в режиме разработки
 */
export const MOCK_STORAGE_PROTOCOL = "mock-storage://";

/**
 * Константы для кэширования Service Worker (workbox)
 */
export const SW_CACHE_CONSTANTS = {
    AVATARS: "avatars-cache",
    FONTS: "fonts-cache",
    MAX_AVATARS_ENTRIES: 100,
    MAX_AVATARS_AGE_DAYS: 30,
    MAX_FONTS_ENTRIES: 10,
    MAX_FONTS_AGE_DAYS: 365,
} as const;
