import { USER_WEB_STATUS } from "@/lib/constants";
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
        const extractString = (val: unknown, fallback: string): string => {
            if (Array.isArray(val)) {
                return val[0] || fallback;
            }
            if (typeof val === "string" && val.trim() !== "") {
                return val;
            }
            return fallback;
        };

        let displayName = "Anonymous";
        let avatarUrl: string | null = null;

        if (user.profile_type === "public") {
            displayName = user.display_name || user.username || "";
            avatarUrl = user.avatar ? getFileUrl(user, user.avatar) : null;
        } else {
            // private или undefined (по умолчанию считаем приватным для безопасности)
            if (
                import.meta.env.DEV &&
                (user.encrypted_profile as Record<string, unknown>)?.mock
            ) {
                // Dev-mode bypass для моковых данных
                displayName = user.display_name || user.username || "Mock User";
                avatarUrl = user.avatar ? getFileUrl(user, user.avatar) : null;
            }
        }

        const domainUser = {
            id: user.id,
            email: user.email,
            username: user.username || "",
            display_name: displayName,
            avatar_url: avatarUrl,
            profile_type: user.profile_type,
            status: extractString(user.status, USER_WEB_STATUS.OFFLINE),
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
