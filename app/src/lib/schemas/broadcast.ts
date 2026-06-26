import { z } from "zod";
import { ATTACHMENT_TYPES } from "@/lib/constants";

/**
 * Схема Zod для валидации полезной нагрузки задачи типа 'broadcast'.
 * Использует константы ATTACHMENT_TYPES для строгой рантайм-валидации медиафайлов.
 */
export const broadcastTaskPayloadSchema = z.object({
    /** Текст рассылки */
    text: z.string(),
    /** ID администратора, создавшего рассылку */
    adminId: z.string(),
    /** Массив ID медиа-вложений */
    attachments: z.array(z.string()).default([]),
    /** Обогащенные метаданные медиа-вложений от сервера */
    mediaAttachments: z
        .array(
            z.object({
                id: z.string(),
                file_name: z.string(),
                file_size: z.number(),
                content_type: z.string(),
                type: z.union([
                    z.literal(ATTACHMENT_TYPES.IMAGE),
                    z.literal(ATTACHMENT_TYPES.VIDEO),
                    z.literal(ATTACHMENT_TYPES.AUDIO),
                    z.literal(ATTACHMENT_TYPES.DOCUMENT),
                ]),
            }),
        )
        .optional(),
});
