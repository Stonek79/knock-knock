import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS, USER_FIELDS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { userRepository } from "@/lib/repositories/user.repository";
import type { UserSecurityKeys } from "@/lib/types";

/**
 * Хук для получения публичных ключей безопасности пользователя.
 */
export function useProfileKeys(userId: string | undefined) {
    const {
        data: profileKeys,
        isLoading,
        error,
    } = useQuery({
        queryKey: QUERY_KEYS.profileKeys(userId || ""),
        queryFn: async (): Promise<UserSecurityKeys | null> => {
            if (!userId) {
                return null;
            }

            const result = await userRepository.getSecurityKeys(userId);

            if (result.isErr()) {
                logger.error(
                    `Ошибка при получении ключей профиля через userRepository ${userId}:`,
                    result.error,
                );
                return null;
            }

            return result.value;
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5,
    });

    // Проверяем наличие обоих ключей
    const areKeysPublished = !!(
        profileKeys?.[USER_FIELDS.PUBLIC_KEY_X25519] &&
        profileKeys?.[USER_FIELDS.PUBLIC_KEY_SIGNING]
    );

    return {
        profileKeys,
        areKeysPublished,
        isLoading,
        error,
    };
}
