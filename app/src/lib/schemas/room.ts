import { z } from 'zod';
import { CHAT_TYPE } from '@/lib/constants/common';

/**
 * Перечисления
 */
export const roomTypeSchema = z.enum(['direct', 'group']);
export const memberRoleSchema = z.enum(['admin', 'member']);
export const chatTypeSchema = z.enum(CHAT_TYPE);

/**
 * Схема комнаты (rooms)
 */
export const roomSchema = z.object({
    id: z.uuid(),
    created_at: z.string(),
    type: roomTypeSchema,
    name: z.string().nullable(),
    avatar_url: z.string().nullable(),
    is_ephemeral: z.boolean(),
});

/**
 * Схема участника комнаты (room_members)
 */
export const roomMemberSchema = z.object({
    room_id: z.uuid(),
    user_id: z.uuid(),
    role: memberRoleSchema,
    joined_at: z.string(),
});

/**
 * Схема ключа комнаты (room_keys)
 */
export const roomKeySchema = z.object({
    room_id: z.uuid(),
    user_id: z.uuid(),
    encrypted_key: z.string(),
    created_at: z.string(),
});
