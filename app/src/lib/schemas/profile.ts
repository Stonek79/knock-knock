import { z } from "zod";
import { VALIDATION } from "@/lib/constants";

// Схема для валидации формы обновления профиля
export const profileSchema = z.object({
    username: z
        .string()
        .min(VALIDATION.USERNAME_MIN_LENGTH, {
            message: "validation.usernameMin",
        })
        .optional(),
    display_name: z.string().optional(),
});

// Полная схема модели профиля (из БД)
export const profileModelSchema = z.object({
    id: z.string().uuid(),
    username: z.string(),
    display_name: z.string(),
    avatar_url: z.string().nullable(),
    status: z.string().optional(),
    last_seen: z.string().optional(),
    role: z.enum(["user", "admin"]).optional(),
    banned_until: z.string().nullable().optional(),
    is_agreed_to_rules: z.boolean().optional(),
    created_at: z.string().optional(),
});
