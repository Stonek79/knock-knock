import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import { getRoomUnreadCounts } from "@/lib/services/room/queries";
import type { UnreadCount } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";

/**
 * Хук для получения счетчиков непрочитанных сообщений.
 * Содержит только логику получения данных и предоставления их компонентам.
 * Синхронизация данных в реальном времени осуществляется через ChatRealtimeService на уровне AuthLayout.
 */
export function useUnreadCounts() {
    const { pbUser } = useAuthStore();

    const { data: counts = [] } = useQuery({
        queryKey: QUERY_KEYS.unreadCounts(pbUser?.id),
        queryFn: async (): Promise<UnreadCount[]> => {
            if (!pbUser) {
                return [];
            }

            const result = await getRoomUnreadCounts(pbUser.id);

            if (result.isErr()) {
                return [];
            }

            return result.value;
        },
        enabled: !!pbUser,
        staleTime: 1000 * 60, // 1 минута
    });

    /**
     * Получить количество непрочитанных для конкретной комнаты.
     */
    const getCount = (roomId: string) => {
        return counts.find((c) => c.room_id === roomId)?.count || 0;
    };

    return { counts, getCount };
}
