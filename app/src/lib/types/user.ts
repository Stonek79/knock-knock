import type { z } from "zod";
import type {
    LOCAL_KEY_TYPES,
    PROFILE_TYPE,
    USER_FIELDS,
} from "@/lib/constants";
import type { folderSchema } from "@/lib/schemas/folder";
import type { profileTypeSchema } from "@/lib/schemas/profile";
import type { userSettingsSchema } from "@/lib/schemas/settings";

/**
 * Доменная модель папки
 */
export type UserFolder = z.infer<typeof folderSchema>;

/**
 * Настройки пользователя
 */
export type UserSettings = z.infer<typeof userSettingsSchema>;

/** Значения profile_type, выведенные из runtime-схемы профиля. */
export type ProfileType = z.infer<typeof profileTypeSchema>;
export type PublicProfileType = Extract<
    ProfileType,
    typeof PROFILE_TYPE.PUBLIC
>;
export type PrivateProfileType = Extract<
    ProfileType,
    typeof PROFILE_TYPE.PRIVATE
>;

/**
 * Тип для публичных ключей безопасности, выведенный из констант полей БД.
 * Гарантирует, что ключами объекта будут именно значения из USER_FIELDS.
 */
export type UserSecurityKeys = {
    [K in
        | typeof USER_FIELDS.PUBLIC_KEY_X25519
        | typeof USER_FIELDS.PUBLIC_KEY_SIGNING]: string;
};

/**
 * Ответ серверного capability-эндпоинта POST /api/custom/users/keys.
 * Ровно три поля: id и два public E2EE-ключа. Никаких полей записи users,
 * профиля или account. Приватный ключ сюда не попадает никогда.
 */
export type ProfileSecurityKeyDto = {
    id: string;
    public_key_x25519: string;
    public_key_signing: string;
};

export type PublicProfileSearchDto = {
    id: string;
    profile_type: PublicProfileType;
    username: string;
    display_name: string;
    avatar: string;
};

export type PublicContactProfileDto = {
    id: string;
    profile_type: PublicProfileType;
    username: string;
    display_name: string;
    avatar: string;
    status: string;
    last_seen: string;
};

export type PrivateContactProfileDto = {
    id: string;
    profile_type: PrivateProfileType;
};

export type ContactProfileDto =
    | PublicContactProfileDto
    | PrivateContactProfileDto;

export type AdminUserDto = {
    id: string;
    profile_type: ProfileType;
    username: string;
    display_name: string;
    created: string;
    banned_until: string | null;
};

/** Типы ключей, хранимых локально (identity | prekey) */
export type KeyType = (typeof LOCAL_KEY_TYPES)[keyof typeof LOCAL_KEY_TYPES];
