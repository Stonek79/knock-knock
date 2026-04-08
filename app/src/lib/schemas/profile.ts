import { z } from "zod";
import { USER_ROLE, VALIDATION } from "@/lib/constants";
import { userSettingsSchema } from "./settings";

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
    id: z.string(),
    email: z.email().nullable().optional(),
    username: z.string().default("").optional(),
    display_name: z.string().default(""),
    avatar_url: z.string().nullable().optional(),
    status: z.string().optional(),
    last_seen: z.string().optional(),
    role: z.enum([USER_ROLE.USER, USER_ROLE.ADMIN] as const).optional(),
    banned_until: z.string().nullable().optional(),
    is_agreed_to_rules: z.boolean().optional(),
    created_at: z.string().optional(),
    settings: userSettingsSchema.optional().nullable(),
});
