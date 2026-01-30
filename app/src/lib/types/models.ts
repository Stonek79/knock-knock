import type { z } from "zod";
import type { profileModelSchema } from "@/lib/schemas/profile";

/**
 * Профиль пользователя (таблица profiles)
 */
export type Profile = z.infer<typeof profileModelSchema>;

/**
 * Профиль с эфемерой (статус онлайн/офлайн)
 * Используется в UI для отображения
 */
export type ProfileWithStatus = Profile & {
	status: "online" | "offline";
};
