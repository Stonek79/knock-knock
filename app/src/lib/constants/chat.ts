export const MESSAGE_STATUS = {
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
} as const;

export type MessageStatusType =
    (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

export const DB_TABLES = {
    MESSAGES: 'messages',
    PROFILES: 'profiles',
    ROOMS: 'rooms',
    ROOM_MEMBERS: 'room_members',
} as const;

export const REALTIME_EVENTS = {
    INSERT: 'INSERT',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
} as const;

export const STORAGE_KEYS = {
    CHAT_LAST_VIEWED: 'chat_last_viewed',
} as const;

export const ROOM_TYPE = {
    DIRECT: 'direct',
    GROUP: 'group',
} as const;

export const MEMBER_ROLE = {
    ADMIN: 'admin',
    MEMBER: 'member',
} as const;
