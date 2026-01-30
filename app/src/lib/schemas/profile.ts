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
	id: z.uuid(),
	username: z.string(),
	display_name: z.string(),
	email: z.email(),
	avatar_url: z.string().nullable(),
	updated_at: z.string(),
});

export type ProfileSchema = z.infer<typeof profileSchema>;
