/** Название приложения */
export const APP_NAME = "KnokKnok";

/** ID корневого элемента в DOM */
export const DOM_ROOT_ID = "root";

/** Версия приложения */
export const APP_VERSION = "0.1.0";

/**
 * Типы создаваемых чатов.
 */
export const CHAT_TYPE = {
    /** Обычный чат */
    PUBLIC: "public",
    /** Приватный чат с E2E шифрованием */
    PRIVATE: "private",
    /** Групповой чат */
    GROUP: "group",
} as const;

/** Режим разработчика */
/** Режим разработчика (заменяется Vite при сборке на true/false) */
export const IS_DEV = import.meta.env.DEV;
