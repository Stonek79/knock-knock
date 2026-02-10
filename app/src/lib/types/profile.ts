import type { z } from "zod";
import type { profileModelSchema, profileSchema } from "@/lib/schemas/profile";

/**
 * Профиль пользователя (таблица profiles)
 */
export type Profile = z.infer<typeof profileModelSchema>;

/**
 * Схема для валидации формы обновления профиля
 */
export type ProfileSchema = z.infer<typeof profileSchema>;

/**
 * Профиль с статусом (онлайн/офлайн)
 */
export type ProfileWithStatus = Profile & {
    status: "online" | "offline";
};
