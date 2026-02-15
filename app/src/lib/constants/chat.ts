/**
 * Константы для чат-функционала.
 */

/** Статусы сообщений */
export const MESSAGE_STATUS = {
    SENT: "sent",
    DELIVERED: "delivered",
    READ: "read",
} as const;

/** Ключи локального хранилища для чата */
export const STORAGE_KEYS = {
    CHAT_LAST_VIEWED: "chat_last_viewed",
} as const;

/** Типы комнат */
export const ROOM_TYPE = {
    DIRECT: "direct",
    GROUP: "group",
} as const;

/** Роли участников комнаты */
export const MEMBER_ROLE = {
    ADMIN: "admin",
    MEMBER: "member",
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
