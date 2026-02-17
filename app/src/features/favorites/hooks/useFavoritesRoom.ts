import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ERROR_CODES } from "@/lib/constants";
import { RoomService } from "@/lib/services/room";
import { appError } from "@/lib/utils/result";
import { useAuthStore } from "@/stores/auth";

/**
 * Хук для получения или создания ID комнаты для "Saved Messages" (чат с самим собой).
 */
export function useFavoritesRoom() {
    const { t } = useTranslation();
    const { user } = useAuthStore();

    return useQuery({
        queryKey: ["favorites-room", user?.id],
        queryFn: async () => {
            if (!user) {
                throw appError(
                    ERROR_CODES.UNAUTHORIZED,
                    t(
                        "auth.errors.unauthorized",
                        "Пожалуйста, войдите в систему",
                    ),
                );
            }

            // Находим или создаем чат с самим собой (targetUserId === currentUserId)
            const res = await RoomService.findOrCreateDM(user.id, user.id);

            if (res.isErr()) {
                console.error("Failed to find/create self-DM:", res.error);
                throw res.error;
            }

            return res.value;
        },
        enabled: !!user,
        retry: false,
        staleTime: 1000 * 60 * 60, // Кешируем на 1 час для стабильности
    });
}
