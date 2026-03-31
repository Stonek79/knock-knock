import { USER_ROLE, USER_WEB_STATUS } from "@/lib/constants";
import { profileModelSchema } from "@/lib/schemas/profile";
import type { Profile, UserRecord } from "@/lib/types";

/**
 * МАППЕР ДЛЯ ПОЛЬЗОВАТЕЛЕЙ
 * Отвечает за преобразование сырых данных PocketBase (UserRecord) в доменную модель Profile.
 *
 * @see {@link Profile} Доменная модель профиля пользователя.
 * @see {@link UserRecord} Тип записи пользователя в базе данных.
 */
export const UserMapper = {
    /**
     * Преобразование записи из базового слоя (БД) в доменный слой приложения.
     *
     * @param user - Исходная запись пользователя из PocketBase.
     * @param getFileUrl - Коллбэк для формирования полного URL файла.
     *                     Инверсия зависимости позволяет мапперу не знать о конкретном SDK.
     * @returns Объект профиля, готовый для использования в бизнес-логике и UI.
     */
    toDomain(
        user: UserRecord,
        getFileUrl: (record: UserRecord, filename: string) => string,
    ): Profile {
        const domainUser = {
            id: user.id,
            email: user.email,
            username: user.username || "",
            display_name: user.display_name || user.username || "",
            avatar_url: user.avatar ? getFileUrl(user, user.avatar) : null,
            role: user.role ?? USER_ROLE.USER,
            status: user.status ?? USER_WEB_STATUS.OFFLINE,
            last_seen:
                user.last_seen || user.updated || new Date().toISOString(),
            is_agreed_to_rules: user.is_agreed_to_rules ?? false,
            banned_until: user.banned_until || null,
            created_at: user.created,
            settings: (user.settings as Record<string, unknown>) || {},
        };

        return profileModelSchema.parse(domainUser);
    },
};
