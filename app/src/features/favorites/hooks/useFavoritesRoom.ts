import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ERROR_CODES, QUERY_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { RoomService } from "@/lib/services/room";
import { appError } from "@/lib/utils/result";
import { useAuthStore } from "@/stores/auth";

/**
 * Хук для получения или создания ID комнаты для «Saved Messages» (чат с самим собой).
 * Использует QUERY_KEYS.favoritesRoom и profile из authStore.
 */
export function useFavoritesRoom() {
    const { t } = useTranslation();
    const { profile } = useAuthStore();

    return useQuery({
        queryKey: QUERY_KEYS.favoritesRoom(profile?.id),
        queryFn: async () => {
            if (!profile) {
                throw appError(
                    ERROR_CODES.UNAUTHORIZED,
                    t(
                        "auth.errors.unauthorized",
                        "Пожалуйста, войдите в систему",
                    ),
                );
            }

            // Находим или создаем чат с самим собой (targetUserId === currentUserId)
            const res = await RoomService.findOrCreateDM(
                profile.id,
                profile.id,
            );

            if (res.isErr()) {
                logger.error(
                    "Не удалось найти или создать чат с самим собой",
                    res.error,
                );
                throw res.error;
            }

            return res.value;
        },
        enabled: !!profile,
        retry: false,
        staleTime: 1000 * 60 * 60, // Кешируем на 1 час для стабильности
    });
}
