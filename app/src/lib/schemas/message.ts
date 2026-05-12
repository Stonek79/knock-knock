import { z } from "zod";
import { ATTACHMENT_TYPES, MESSAGE_POSITION } from "@/lib/constants";

/**
 * Схема метаданных сообщения.
 * Описывает структуру внутри JSON-поля 'metadata'.
 */
export const messageMetadataSchema = z
    .object({
        deleted_by: z.array(z.string()).default([]), // Список ID пользователей, скрывших сообщение для себя
        moderated_by: z.string().optional(), // ID пользователя (админа/владельца), удалившего сообщение для всех
        moderation: z.boolean().optional(), // Флаг модерации
    })
    .strict()
    .default({ deleted_by: [] });

/**
 * Схема вложения сообщения (медиа или файл).
 * Описывает структуру объекта в массиве 'attachments' (JSON).
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
 * Схема позиции сообщения в группе (UI логика)
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
    created: z.string(),
});
/** Схема для валидации reactions_summary (JSON-поле в БД) */
export const reactionsSummarySchema = z
    .record(z.string(), z.number())
    .nullable();
