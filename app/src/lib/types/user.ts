import type { z } from "zod";
import type { USER_FIELDS, USER_ROLE } from "@/lib/constants";
import type { folderSchema } from "@/lib/schemas/folder";
import type { userSettingsSchema } from "@/lib/schemas/settings";

/**
 * Доменная модель папки
 */
export type UserFolder = z.infer<typeof folderSchema>;

/**
 * Роль пользователя (системные)
 */
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/**
 * Настройки пользователя
 */
export type UserSettings = z.infer<typeof userSettingsSchema>;

/**
 * Тип для публичных ключей безопасности, выведенный из констант полей БД.
 * Гарантирует, что ключами объекта будут именно значения из USER_FIELDS.
 */
export type UserSecurityKeys = {
    [K in
        | typeof USER_FIELDS.PUBLIC_KEY_X25519
        | typeof USER_FIELDS.PUBLIC_KEY_SIGNING]: string;
};
