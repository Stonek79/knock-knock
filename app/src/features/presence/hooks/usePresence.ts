import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS, USER_WEB_STATUS } from "@/lib/constants";
import { presenceRepository } from "@/lib/repositories/presence.repository";
import { useAuthStore } from "@/stores/auth";

/**
 * Хук для отслеживания онлайн-статуса пользователей.
 * Теперь это чистый потребитель кэша React Query.
 * Heartbeat и подписки управляются глобально через ChatRealtimeService.
 */
export function usePresence() {
    const pbUser = useAuthStore((state) => state.pbUser);

    const { data: onlineUsers = {} } = useQuery({
        queryKey: QUERY_KEYS.presence(),
        queryFn: async (): Promise<Record<string, string>> => {
            if (!pbUser) {
                return {};
            }

            const result = await presenceRepository.getAllPresence();
            if (result.isErr()) {
                return {};
            }

            const initialMap: Record<string, string> = {};
            const now = Date.now();

            for (const r of result.value) {
                // Если пинг был более 60 секунд назад — считаем оффлайн (защита от 'зависших' рекордов)
                const lastPing = new Date(r.last_ping).getTime();
                const isStale = now - lastPing > 60000;

                initialMap[r.user] =
                    r.is_online && !isStale
                        ? USER_WEB_STATUS.ONLINE
                        : USER_WEB_STATUS.OFFLINE;
            }

            return initialMap;
        },
        enabled: !!pbUser,
        staleTime: 1000 * 30, // Данные обновляются реалтаймом, кэш живет 30 сек
    });

    return onlineUsers;
}
