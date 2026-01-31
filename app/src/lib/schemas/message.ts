import { z } from 'zod';

/**
 * Схема сообщения (messages)
 */
export const messageSchema = z.object({
    id: z.uuid(),
    room_id: z.uuid(),
    sender_id: z.uuid().nullable(),
    content: z.string(), // Base64 зашифрованный контент
    iv: z.string(),
    created_at: z.string(),
});
