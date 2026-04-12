/** Название приложения */
export const APP_NAME = "KnokKnok";
export const APP_NAME_RU = "Тук-Тук";

export const FULL_APP_NAME = "Knock Knock";

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

export const NOTIFICATION_CONFIG = {
    VAPID_KEY_ENV: "VITE_VAPID_PUBLIC_KEY",
    ICON: "/images/favicon-en.png",
    BADGE: "/images/favicon-en.png",
    VIBRATE_PATTERN: [100, 50, 100],
    USER_VISIBLE_ONLY: true,
} as const;

/** Статусы прав на уведомления */
export const NOTIFICATION_PERMISSIONS = {
    GRANTED: "granted",
    DENIED: "denied",
    DEFAULT: "default",
} as const;
/** Действия уведомлений */
export const NOTIFICATION_ACTIONS = {
    OPEN: "open",
    CLOSE: "close",
} as const;
