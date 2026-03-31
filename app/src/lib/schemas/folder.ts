import { z } from "zod";

/**
 * Схема папки пользователя (user_folders)
 */
export const folderSchema = z.object({
    id: z.string(),
    user_id: z.string(),
    name: z.string(),
    icon: z.string().nullable().optional(),
    order: z.number().default(0),
    created_at: z.string(),
});
