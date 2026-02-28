import { z } from "zod";
import {
    ATTACHMENT_TYPES,
    MESSAGE_POSITION,
    MESSAGE_STATUS,
} from "@/lib/constants";

/**
 * Схема вложения сообщения (медиа или файл)
 */
export const messageAttachmentSchema = z.object({
    id: z.string(),
    file_name: z.string(),
    file_size: z.number(),
    content_type: z.string(),
    url: z.string(),
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
    id: z.uuid(),
    room_id: z.uuid(),
    sender_id: z.uuid().nullable(),
    content: z.string().nullable(), // Nullable for deleted messages
    iv: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string().optional(),
    status: z
        .enum([
            MESSAGE_STATUS.SENT,
            MESSAGE_STATUS.DELIVERED,
            MESSAGE_STATUS.READ,
        ])
        .default(MESSAGE_STATUS.SENT),
    deleted_by: z.array(z.string()).default([]),
    is_edited: z.boolean().default(false),
    is_deleted: z.boolean().default(false),
    is_starred: z.boolean().default(false),
    attachments: z.array(messageAttachmentSchema).nullable().default(null),
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
