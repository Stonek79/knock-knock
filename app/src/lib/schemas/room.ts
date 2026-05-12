import { z } from "zod";
import { MEMBER_ROLE, ROOM_TYPE, ROOM_VISIBILITY } from "../constants";

/**
 * Схемы перечислений (используются в UI и для валидации параметров API)
 */
export const roomTypeSchema = z.enum([
    ROOM_TYPE.DIRECT,
    ROOM_TYPE.GROUP,
    ROOM_TYPE.EPHEMERAL,
]);
export const memberRoleSchema = z.enum([
    MEMBER_ROLE.OWNER,
    MEMBER_ROLE.ADMIN,
    MEMBER_ROLE.MEMBER,
]);
export const roomVisibilitySchema = z.enum([
    ROOM_VISIBILITY.PUBLIC,
    ROOM_VISIBILITY.PRIVATE,
]);

/** Схема профиля участника (для вложенности в expand) */
export const memberProfileSchema = z.object({
    display_name: z.string(),
    username: z.string().optional(),
    avatar_url: z.string().nullable().optional(),
});

/** Схема расширенного участника (ExpandedRoomMember) */
export const expandedMemberSchema = z.object({
    room_id: z.string(),
    user_id: z.string(),
    role: memberRoleSchema,
    joined_at: z.string(),
    unread_count: z.number().default(0),
    last_read_at: z.string().nullable().optional(),
    user_name: z.string().optional(),
    user_avatar: z.string().optional(),
    pin_position: z.number().nullable().optional(),
    profiles: memberProfileSchema.nullable().optional(),
});

/**
 * Схема превью последнего сообщения (для отображения в списке чатов).
 * Вычисляется в репозитории, не хранится в БД.
 */
export const lastMessagePreviewSchema = z
    .object({
        id: z.string().optional(),
        content: z.string().nullable().optional(),
        created: z.string(),
        is_deleted: z.boolean().optional(),
        attachments: z
            .array(
                z.object({
                    type: z.string(),
                }),
            )
            .nullable()
            .optional(),
    })
    .nullable()
    .optional();

/** Схема комнаты со всеми связями (доменная модель RoomWithMembers) */
export const roomWithMembersSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    type: roomTypeSchema,
    visibility: roomVisibilitySchema,
    avatar_url: z.string().nullable(),
    created_by: z.string(),
    created_at: z.string(),
    updated: z.string().optional(),
    room_members: z.array(expandedMemberSchema),
    metadata: z.record(z.string(), z.unknown()).default({}),
    permissions: z.record(z.string(), z.unknown()).default({}),
    last_message: lastMessagePreviewSchema,
});

/** Схема PeerUser для UI */
export const peerUserSchema = z.object({
    id: z.string(),
    display_name: z.string(),
    username: z.string().optional(),
    avatar_url: z.string().nullable().optional(),
});
