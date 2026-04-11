import type {
    AuthSystemFields,
    CollectionName,
    MediaRecord,
    MessageReactionsResponse,
    MessagesResponse,
    MessagesStatusOptions,
    MessagesTypeOptions,
    PBRealtimeAction,
    PresenceStatusResponse,
    PushSubscriptionsResponse,
    RoomMembersResponse,
    RoomMembersRoleOptions,
    RoomsResponse,
    RoomsTypeOptions,
    UserFoldersResponse,
    UsersResponse,
    UsersRoleOptions,
    UsersStatusOptions,
} from "../types";

type AllFields<T> =
    | Extract<keyof T, string>
    | Extract<keyof AuthSystemFields, string>
    | "id"
    | "created"
    | "updated";

/**
 * Названия коллекций PocketBase
 * Генерируем типы для консистентности, но значения задаем явно для чистоты имен (без подчеркиваний).
 */
export const DB_TABLES = {
    USERS: "users",
    ROOMS: "rooms",
    ROOM_MEMBERS: "room_members",
    ROOM_KEYS: "room_keys",
    MESSAGES: "messages",
    FAVORITES: "favorites",
    PRESENCE_STATUS: "presence_status",
    MESSAGE_REACTIONS: "message_reactions",
    USER_FOLDERS: "user_folders",
    MESSAGE_REPORTS: "message_reports",
    PUSH_SUBSCRIPTIONS: "push_subscriptions",
} as const satisfies Record<string, CollectionName>;

/** Поля коллекции users */
export const USER_FIELDS = {
    ID: "id",
    EMAIL: "email",
    USERNAME: "username",
    DISPLAY_NAME: "display_name",
    AVATAR: "avatar",
    STATUS: "status",
    ROLE: "role",
    LAST_SEEN: "last_seen",
    SETTINGS: "settings",
    PUBLIC_KEY_X25519: "public_key_x25519",
    PUBLIC_KEY_SIGNING: "public_key_signing",
    BANNED_UNTIL: "banned_until",
    IS_AGREED_TO_RULES: "is_agreed_to_rules",
    CREATED: "created",
    UPDATED: "updated",
} as const satisfies Record<string, AllFields<UsersResponse>>;

/** Поля коллекции rooms */
export const ROOM_FIELDS = {
    ID: "id",
    NAME: "name",
    TYPE: "type",
    VISIBILITY: "visibility",
    AVATAR: "avatar",
    CREATED_BY: "created_by",
    LAST_MESSAGE: "last_message",
    METADATA: "metadata",
    PERMISSIONS: "permissions",
    IS_TEST: "is_test",
    CREATED: "created",
    UPDATED: "updated",
} as const satisfies Record<string, AllFields<RoomsResponse>>;

/** Поля коллекции room_members */
export const ROOM_MEMBER_FIELDS = {
    ID: "id",
    ROOM: "room",
    USER: "user",
    ROLE: "role",
    UNREAD_COUNT: "unread_count",
    USER_NAME: "user_name",
    USER_AVATAR: "user_avatar",
    FOLDER_ID: "folder_id",
    PIN_POSITION: "pin_position",
    SETTINGS: "settings",
    PERMISSIONS: "permissions",
    IS_HIDDEN: "is_hidden",
    LAST_READ_AT: "last_read_at",
    IS_TEST: "is_test",
    CREATED: "created",
    UPDATED: "updated",
} as const satisfies Record<string, AllFields<RoomMembersResponse>>;

/** Поля коллекции messages */
export const MESSAGE_FIELDS = {
    ID: "id",
    ROOM: "room",
    SENDER: "sender",
    SENDER_NAME: "sender_name",
    SENDER_AVATAR: "sender_avatar",
    CONTENT: "content",
    IV: "iv",
    TYPE: "type",
    STATUS: "status",
    METADATA: "metadata",
    REACTIONS_SUMMARY: "reactions_summary",
    IS_DELETED: "is_deleted",
    IS_EDITED: "is_edited",
    IS_STARRED: "is_starred",
    ATTACHMENTS: "attachments",
    REPLY_TO: "reply_to",
    IS_TEST: "is_test",
    CREATED: "created",
    UPDATED: "updated",
} as const satisfies Record<string, AllFields<MessagesResponse>>;

export const MESSAGE_STATUS = {
    SENT: "sent",
    READ: "read",
    DELIVERED: "delivered",
} as const satisfies Record<string, MessagesStatusOptions>;

/** Типы комнат */
export const ROOM_TYPE = {
    DIRECT: "direct",
    GROUP: "group",
    EPHEMERAL: "ephemeral",
} as const satisfies Record<string, RoomsTypeOptions>;

/** Видимость комнат */
export const ROOM_VISIBILITY = {
    PUBLIC: "public",
    PRIVATE: "private",
} as const;

/** Роли участников комнаты */
export const MEMBER_ROLE = {
    OWNER: "owner",
    ADMIN: "admin",
    MEMBER: "member",
} as const satisfies Record<string, RoomMembersRoleOptions>;

/** Типы сообщений */
export const MESSAGE_TYPE = {
    TEXT: "text",
    IMAGE: "image",
    AUDIO: "audio",
    VIDEO: "video",
    FILE: "file",
    SYSTEM: "system",
} as const satisfies Record<string, MessagesTypeOptions>;

/** Статусы пользователя */
export const USER_WEB_STATUS = {
    ONLINE: "online",
    OFFLINE: "offline",
    AWAY: "away",
} as const satisfies Record<string, UsersStatusOptions>;

/** Роли пользователя (системные) */
export const USER_ROLE = {
    USER: "user",
    ADMIN: "admin",
} as const satisfies Record<string, UsersRoleOptions>;

/** Поля коллекции presence_status */
export const PRESENCE_FIELDS = {
    ID: "id",
    USER: "user",
    IS_ONLINE: "is_online",
    IS_TYPING: "is_typing",
    ROOM_ID: "room_id",
    LAST_PING: "last_ping",
    IS_TEST: "is_test",
    CREATED: "created",
    UPDATED: "updated",
} as const satisfies Record<string, AllFields<PresenceStatusResponse>>;

/** Поля коллекции message_reactions */
export const REACTION_FIELDS = {
    ID: "id",
    MESSAGE: "message",
    USER: "user",
    EMOJI: "emoji",
    IS_TEST: "is_test",
    CREATED: "created",
    UPDATED: "updated",
} as const satisfies Record<string, AllFields<MessageReactionsResponse>>;

/** Поля коллекции user_folders */
export const FOLDER_FIELDS = {
    ID: "id",
    USER: "user",
    NAME: "name",
    ICON: "icon",
    ORDER: "order",
    IS_TEST: "is_test",
    CREATED: "created",
    UPDATED: "updated",
} as const satisfies Record<string, AllFields<UserFoldersResponse>>;

export const PUSH_SUBSCRIPTIONS_FIELDS = {
    ID: "id",
    ENDPOINT: "endpoint",
    P256DH: "p256dh",
    AUTH: "auth",
    CREATED: "created",
    UPDATED: "updated",
} as const satisfies Record<string, AllFields<PushSubscriptionsResponse>>;

/** Поля коллекции media */
export const MEDIA_FIELDS = {
    ID: "id",
    FILE: "file",
    CREATED_BY: "created_by",
    TYPE: "type",
    SIZE: "size",
    MIME_TYPE: "mime_type",
    METADATA: "metadata",
    CREATED: "created",
    UPDATED: "updated",
} as const satisfies Record<string, AllFields<MediaRecord>>;

/**
 * Действия Realtime-событий
 */
export const REALTIME_ACTIONS = {
    CREATE: "create",
    UPDATE: "update",
    DELETE: "delete",
} as const satisfies Record<string, PBRealtimeAction>;

/**
 * Ключи для раскрытия связей (expand).
 * Составляются динамически из имен таблиц и полей для обеспечения консистентности.
 */
export const DB_EXPAND = {
    // room_members(room)
    MEMBERS: `${DB_TABLES.ROOM_MEMBERS}(${ROOM_MEMBER_FIELDS.ROOM})`,
    // user (поле в room_members)
    USER: ROOM_MEMBER_FIELDS.USER,
    // last_message (поле в rooms)
    LAST_MESSAGE: ROOM_FIELDS.LAST_MESSAGE,
    // sender (внутри последнего сообщения комнаты)
    LAST_MESSAGE_SENDER: `${ROOM_FIELDS.LAST_MESSAGE}.${MESSAGE_FIELDS.SENDER}`,
} as const;
/** Общие поля, присутствующие в большинстве коллекций */
export const DB_FIELDS = {
    IS_TEST: "is_test",
} as const;
