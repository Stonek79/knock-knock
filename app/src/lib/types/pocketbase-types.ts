/**
 * ЭТОТ ФАЙЛ СГЕНЕРИРОВАН АВТОМАТИЧЕСКИ. НЕ РЕДАКТИРУЙТЕ.
 */

import type PocketBase from "pocketbase";
import type { RecordService } from "pocketbase";

export type CollectionName =
    | "_mfas"
    | "_otps"
    | "_externalAuths"
    | "_authOrigins"
    | "_superusers"
    | "users"
    | "rooms"
    | "room_members"
    | "messages"
    | "room_keys"
    | "favorites"
    | "presence_status"
    | "message_reactions"
    | "user_folders"
    | "message_reports"
    | "push_subscriptions"
    | "media"
    | "task_queue";

// Вспомогательные типы
export type RecordIdString = string;
export type HTMLString = string;
export type IsoDateString = string;

export type BaseSystemFields<T = never> = {
    id: RecordIdString;
    created: IsoDateString;
    updated: IsoDateString;
    collectionId: string;
    collectionName: CollectionName;
    expand?: T;
};

export type AuthSystemFields<T = never> = {
    email: string;
    emailVisibility: boolean;
    username: string;
    verified: boolean;
} & BaseSystemFields<T>;

export type UsersStatusOptions = "online" | "offline" | "away";

export type UsersRoleOptions = "user" | "admin";

export type RoomsTypeOptions = "direct" | "group" | "ephemeral";

export type RoomsVisibilityOptions = "public" | "private";

export type RoomMembersRoleOptions = "owner" | "admin" | "member";

export type MessagesTypeOptions =
    | "text"
    | "image"
    | "audio"
    | "video"
    | "file"
    | "system";

export type MessagesStatusOptions = "sent" | "delivered" | "read";

export type MessageReportsReasonOptions =
    | "spam"
    | "offensive"
    | "illegal"
    | "other";

export type MessageReportsStatusOptions = "pending" | "reviewed" | "dismissed";

export type MediaTypeOptions = "image" | "video" | "audio" | "document";

export type TaskQueueTypeOptions =
    | "push"
    | "email"
    | "media_cleanup"
    | "cleanup"
    | "test";

export type TaskQueueStatusOptions =
    | "pending"
    | "processing"
    | "completed"
    | "failed";

// ---------------------------------------------------------------------------
// Коллекция: _mfas
// ---------------------------------------------------------------------------

export type MfasRecord = {
    collectionRef: string;
    recordRef: string;
    method: string;
};

export type MfasResponse<Texpand = unknown> = Required<MfasRecord> &
    BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: _otps
// ---------------------------------------------------------------------------

export type OtpsRecord = {
    collectionRef: string;
    recordRef: string;
    password: string;
    sentTo?: string;
};

export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> &
    BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: _externalAuths
// ---------------------------------------------------------------------------

export type ExternalAuthsRecord = {
    collectionRef: string;
    recordRef: string;
    provider: string;
    providerId: string;
};

export type ExternalAuthsResponse<Texpand = unknown> =
    Required<ExternalAuthsRecord> & BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: _authOrigins
// ---------------------------------------------------------------------------

export type AuthOriginsRecord = {
    collectionRef: string;
    recordRef: string;
    fingerprint: string;
};

export type AuthOriginsResponse<Texpand = unknown> =
    Required<AuthOriginsRecord> & BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: _superusers
// ---------------------------------------------------------------------------

export type SuperusersRecord = {
    password: string;
    email: string;
};

export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> &
    AuthSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: users
// ---------------------------------------------------------------------------

export type UsersRecord = {
    password: string;
    email: string;
    display_name?: string;
    avatar?: string;
    username?: string;
    status?: UsersStatusOptions;
    role?: UsersRoleOptions;
    last_seen?: string;
    settings?: null | unknown;
    is_agreed_to_rules?: boolean;
    public_key_x25519?: string;
    public_key_signing?: string;
    banned_until?: string;
};

export type UsersResponse<Texpand = unknown> = Required<UsersRecord> &
    AuthSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: rooms
// ---------------------------------------------------------------------------

export type RoomsRecord = {
    name?: string;
    type: RoomsTypeOptions;
    visibility: RoomsVisibilityOptions;
    avatar?: string;
    created_by: RecordIdString;
    last_message?: RecordIdString;
    metadata?: null | unknown;
    permissions?: null | unknown;
    is_test?: boolean;
};

export type RoomsResponse<Texpand = unknown> = Required<RoomsRecord> &
    BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: room_members
// ---------------------------------------------------------------------------

export type RoomMembersRecord = {
    room: RecordIdString;
    user: RecordIdString;
    role: RoomMembersRoleOptions;
    unread_count: number;
    user_name?: string;
    user_avatar?: string;
    folder_id?: string;
    pin_position?: number;
    settings?: null | unknown;
    permissions?: null | unknown;
    is_hidden?: boolean;
    last_read_at?: string;
    is_test?: boolean;
};

export type RoomMembersResponse<Texpand = unknown> =
    Required<RoomMembersRecord> & BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: messages
// ---------------------------------------------------------------------------

export type MessagesRecord = {
    room: RecordIdString;
    sender: RecordIdString;
    sender_name?: string;
    sender_avatar?: string;
    content?: string;
    iv?: string;
    type: MessagesTypeOptions;
    status?: MessagesStatusOptions;
    metadata?: null | unknown;
    reactions_summary?: null | unknown;
    is_deleted?: boolean;
    is_edited?: boolean;
    is_starred?: boolean;
    attachments?: null | unknown;
    reply_to?: RecordIdString;
    is_test?: boolean;
};

export type MessagesResponse<Texpand = unknown> = Required<MessagesRecord> &
    BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: room_keys
// ---------------------------------------------------------------------------

export type RoomKeysRecord = {
    room: RecordIdString;
    user: RecordIdString;
    encrypted_key: string;
    is_test?: boolean;
};

export type RoomKeysResponse<Texpand = unknown> = Required<RoomKeysRecord> &
    BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: favorites
// ---------------------------------------------------------------------------

export type FavoritesRecord = {
    user: RecordIdString;
    room: RecordIdString;
};

export type FavoritesResponse<Texpand = unknown> = Required<FavoritesRecord> &
    BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: presence_status
// ---------------------------------------------------------------------------

export type PresenceStatusRecord = {
    user: RecordIdString;
    is_online?: boolean;
    is_typing?: boolean;
    room_id?: string;
    last_ping?: string;
    is_test?: boolean;
};

export type PresenceStatusResponse<Texpand = unknown> =
    Required<PresenceStatusRecord> & BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: message_reactions
// ---------------------------------------------------------------------------

export type MessageReactionsRecord = {
    message: RecordIdString;
    user: RecordIdString;
    emoji: string;
    is_test?: boolean;
};

export type MessageReactionsResponse<Texpand = unknown> =
    Required<MessageReactionsRecord> & BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: user_folders
// ---------------------------------------------------------------------------

export type UserFoldersRecord = {
    user: RecordIdString;
    name: string;
    icon?: string;
    order?: number;
    is_test?: boolean;
};

export type UserFoldersResponse<Texpand = unknown> =
    Required<UserFoldersRecord> & BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: message_reports
// ---------------------------------------------------------------------------

export type MessageReportsRecord = {
    message: RecordIdString;
    reporter: RecordIdString;
    reason: MessageReportsReasonOptions;
    status: MessageReportsStatusOptions;
    is_test?: boolean;
};

export type MessageReportsResponse<Texpand = unknown> =
    Required<MessageReportsRecord> & BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: push_subscriptions
// ---------------------------------------------------------------------------

export type PushSubscriptionsRecord = {
    user_id: RecordIdString;
    endpoint: string;
    p256dh: string;
    auth: string;
};

export type PushSubscriptionsResponse<Texpand = unknown> =
    Required<PushSubscriptionsRecord> & BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: media
// ---------------------------------------------------------------------------

export type MediaRecord = {
    file: string;
    created_by: RecordIdString;
    type: MediaTypeOptions;
    size?: number;
    mime_type?: string;
    metadata?: null | unknown;
    is_test?: boolean;
};

export type MediaResponse<Texpand = unknown> = Required<MediaRecord> &
    BaseSystemFields<Texpand>;

// ---------------------------------------------------------------------------
// Коллекция: task_queue
// ---------------------------------------------------------------------------

export type TaskQueueRecord = {
    task_key?: string;
    type: TaskQueueTypeOptions;
    payload: null | unknown;
    status?: TaskQueueStatusOptions;
    attempts?: number;
    last_error?: string;
    run_at: string;
};

export type TaskQueueResponse<Texpand = unknown> = Required<TaskQueueRecord> &
    BaseSystemFields<Texpand>;

export type CollectionRecords = {
    _mfas: MfasRecord;
    _otps: OtpsRecord;
    _externalAuths: ExternalAuthsRecord;
    _authOrigins: AuthOriginsRecord;
    _superusers: SuperusersRecord;
    users: UsersRecord;
    rooms: RoomsRecord;
    room_members: RoomMembersRecord;
    messages: MessagesRecord;
    room_keys: RoomKeysRecord;
    favorites: FavoritesRecord;
    presence_status: PresenceStatusRecord;
    message_reactions: MessageReactionsRecord;
    user_folders: UserFoldersRecord;
    message_reports: MessageReportsRecord;
    push_subscriptions: PushSubscriptionsRecord;
    media: MediaRecord;
    task_queue: TaskQueueRecord;
};

export type CollectionResponses = {
    _mfas: MfasResponse;
    _otps: OtpsResponse;
    _externalAuths: ExternalAuthsResponse;
    _authOrigins: AuthOriginsResponse;
    _superusers: SuperusersResponse;
    users: UsersResponse;
    rooms: RoomsResponse;
    room_members: RoomMembersResponse;
    messages: MessagesResponse;
    room_keys: RoomKeysResponse;
    favorites: FavoritesResponse;
    presence_status: PresenceStatusResponse;
    message_reactions: MessageReactionsResponse;
    user_folders: UserFoldersResponse;
    message_reports: MessageReportsResponse;
    push_subscriptions: PushSubscriptionsResponse;
    media: MediaResponse;
    task_queue: TaskQueueResponse;
};

export type TypedPocketBase = PocketBase & {
    collection(idOrName: string): RecordService; // fallback
    collection(idOrName: "_mfas"): RecordService<MfasResponse>;
    collection(idOrName: "_otps"): RecordService<OtpsResponse>;
    collection(
        idOrName: "_externalAuths",
    ): RecordService<ExternalAuthsResponse>;
    collection(idOrName: "_authOrigins"): RecordService<AuthOriginsResponse>;
    collection(idOrName: "_superusers"): RecordService<SuperusersResponse>;
    collection(idOrName: "users"): RecordService<UsersResponse>;
    collection(idOrName: "rooms"): RecordService<RoomsResponse>;
    collection(idOrName: "room_members"): RecordService<RoomMembersResponse>;
    collection(idOrName: "messages"): RecordService<MessagesResponse>;
    collection(idOrName: "room_keys"): RecordService<RoomKeysResponse>;
    collection(idOrName: "favorites"): RecordService<FavoritesResponse>;
    collection(
        idOrName: "presence_status",
    ): RecordService<PresenceStatusResponse>;
    collection(
        idOrName: "message_reactions",
    ): RecordService<MessageReactionsResponse>;
    collection(idOrName: "user_folders"): RecordService<UserFoldersResponse>;
    collection(
        idOrName: "message_reports",
    ): RecordService<MessageReportsResponse>;
    collection(
        idOrName: "push_subscriptions",
    ): RecordService<PushSubscriptionsResponse>;
    collection(idOrName: "media"): RecordService<MediaResponse>;
    collection(idOrName: "task_queue"): RecordService<TaskQueueResponse>;
};
