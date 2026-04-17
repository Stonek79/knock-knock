import { z } from "zod";
import {
    ATTACHMENT_TYPES,
    MESSAGE_POSITION,
    MESSAGE_STATUS,
} from "@/lib/constants";

/**
 * Схема метаданных сообщения
 */
export const messageMetadataSchema = z
    .object({
        deleted_by: z.array(z.string()).default([]),
        moderation: z.boolean().optional(),
    })
    .catchall(z.unknown())
    .default({ deleted_by: [] });

/**
 * Схема вложения сообщения (медиа или файл)
 */
export const messageAttachmentSchema = z.object({
    id: z.string(),
    file_name: z.string(),
    file_size: z.number(),
    content_type: z.string(),
    url: z.string(),
    thumbnail_url: z.string().optional(),
    type: z.enum([
        ATTACHMENT_TYPES.IMAGE,
        ATTACHMENT_TYPES.VIDEO,
        ATTACHMENT_TYPES.AUDIO,
        ATTACHMENT_TYPES.DOCUMENT,
    ]),
});

/**
 * Схема сообщения (messages)
 */
export const messageSchema = z.object({
    id: z.string(),
    room_id: z.string(),
    sender_id: z.string().nullable(),
    sender_name: z.string().optional(),
    sender_avatar: z.string().optional(),
    content: z.string().nullable(),
    iv: z.string().nullable(),
    metadata: messageMetadataSchema,
    attachments: z.array(messageAttachmentSchema).nullable().optional(),
    reactions_summary: z.record(z.string(), z.number()).nullable().optional(),
    created_at: z.string(),
    updated_at: z.string().optional(),
    status: z.enum(MESSAGE_STATUS).default(MESSAGE_STATUS.SENT),
    is_edited: z.boolean().default(false),
    is_deleted: z.boolean().default(false),
    is_starred: z.boolean().default(false),
    profiles: z
        .object({
            display_name: z.string().optional(),
            avatar_url: z.string().optional(),
        })
        .optional(),
});

/**
 * Схема позиции сообщения в группе
 */
export const messagePositionSchema = z.enum([
    MESSAGE_POSITION.SINGLE,
    MESSAGE_POSITION.START,
    MESSAGE_POSITION.MIDDLE,
    MESSAGE_POSITION.END,
]);

/**
 * Схема записи реакции (message_reactions)
 */
export const messageReactionSchema = z.object({
    message_id: z.string(),
    user_id: z.string(),
    emoji: z.string(),
    created_at: z.string(),
});
