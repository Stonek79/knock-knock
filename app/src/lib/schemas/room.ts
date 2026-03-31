import { z } from "zod";
import {
    CHAT_TYPE,
    MEMBER_ROLE,
    ROOM_TYPE,
    ROOM_VISIBILITY,
} from "@/lib/constants";
import { messageSchema } from "./message";
import { profileModelSchema } from "./profile";
import { metadataSchema, roomMemberSettingsSchema } from "./settings";

/**
 * Перечисления
 */
export const roomTypeSchema = z.enum([
    ROOM_TYPE.DIRECT,
    ROOM_TYPE.GROUP,
    ROOM_TYPE.EPHEMERAL,
]);
export const memberRoleSchema = z.enum([MEMBER_ROLE.ADMIN, MEMBER_ROLE.MEMBER]);
export const chatTypeSchema = z.enum(CHAT_TYPE);

/**
 * Схема комнаты (rooms)
 */
export const roomSchema = z.object({
    id: z.string(),
    type: z.enum([ROOM_TYPE.DIRECT, ROOM_TYPE.GROUP, ROOM_TYPE.EPHEMERAL]),
    visibility: z
        .enum([ROOM_VISIBILITY.PUBLIC, ROOM_VISIBILITY.PRIVATE])
        .default(ROOM_VISIBILITY.PRIVATE),
    created_by: z.string(),
    name: z.string().nullable(),
    avatar: z.string().nullable().optional(),
    metadata: metadataSchema,
    permissions: z.record(z.string(), z.unknown()).default({}),
    last_message_id: z.string().nullable().optional(),
    created_at: z.string(),
});

/**
 * Схема участника комнаты (room_members)
 */
export const roomMemberSchema = z.object({
    room_id: z.string(),
    user_id: z.string(),
    role: z.enum([MEMBER_ROLE.OWNER, MEMBER_ROLE.ADMIN, MEMBER_ROLE.MEMBER]),
    unread_count: z.number().default(0),
    user_name: z.string().optional(),
    user_avatar: z.string().optional(),
    settings: roomMemberSettingsSchema,
    permissions: z.record(z.string(), z.unknown()).default({}),
    joined_at: z.string(),
});

/**
 * Схема ключа комнаты (room_keys)
 */
export const roomKeySchema = z.object({
    room_id: z.string(),
    user_id: z.string(),
    encrypted_key: z.string(),
    created_at: z.string(),
});

/**
 * Схема профиля для участников и отправителей.
 * Выбираем только нужные поля из общей схемы профиля.
 */
export const memberProfileSchema = profileModelSchema.pick({
    display_name: true,
    username: true,
    avatar_url: true,
});

/**
 * Схема расширенного участника
 */
export const expandedMemberSchema = roomMemberSchema.extend({
    profiles: memberProfileSchema.nullable(),
    last_read_at: z.string().nullable().optional(),
});

/**
 * Составная схема комнаты
 */
export const roomWithMembersSchema = roomSchema.extend({
    room_members: z.array(expandedMemberSchema),
    last_message: messageSchema.nullable().optional(),
    avatar_url: z.string().nullable().optional(),
});

/**
 * Схема пользователя-собеседника (для UI)
 */
export const peerUserSchema = z.object({
    id: z.string(),
    display_name: z.string(),
    username: z.string().optional(),
    avatar_url: z.string().nullable().optional(),
});

/**
 * Схема счетчика непрочитанных
 */
export const unreadCountSchema = z.object({
    room_id: z.string(),
    count: z.number(),
});
