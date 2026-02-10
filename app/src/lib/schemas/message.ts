import { z } from "zod";
import { MESSAGE_POSITION } from "@/lib/constants";

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
    status: z.enum(["sent", "delivered", "read"]).default("sent"),
    deleted_by: z.array(z.string()).default([]),
    is_edited: z.boolean().default(false),
    is_deleted: z.boolean().default(false),
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
