import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { DB_TABLES } from '@/lib/constants';
import { REALTIME_EVENTS } from '@/lib/constants/chat';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

const UNREAD_CHANNEL = 'unread_tracker';

interface UnreadCount {
    room_id: string;
    count: number;
}

/**
 * Хук для глобального управления счетчиками непрочитанных сообщений.
 * Загружает начальные значения через RPC и обновляет их через Realtime.
 */
export function useUnreadCounts() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Загрузка начальных значений
    const { data: counts = [] } = useQuery({
        queryKey: ['unread_counts', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase.rpc('get_unread_counts');
            if (error) {
                console.error(
                    'Не удалось загрузить счетчики непрочитанных',
                    error,
                );
                return [];
            }
            return data as UnreadCount[];
        },
        enabled: !!user,
        staleTime: Infinity, // Полагаемся на обновления Realtime
    });

    // Подписка на Realtime события
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(UNREAD_CHANNEL)
            // Слушаем новые сообщения (увеличиваем счетчик)
            .on(
                'postgres_changes',
                {
                    event: REALTIME_EVENTS.INSERT,
                    schema: 'public',
                    table: DB_TABLES.MESSAGES,
                },
                (payload) => {
                    const newMsg = payload.new as {
                        room_id: string;
                        sender_id: string;
                    };
                    if (newMsg.sender_id === user.id) return; // Игнорируем свои сообщения

                    queryClient.setQueryData(
                        ['unread_counts', user.id],
                        (old: UnreadCount[] = []) => {
                            const exists = old.find(
                                (c) => c.room_id === newMsg.room_id,
                            );
                            if (exists) {
                                return old.map((c) =>
                                    c.room_id === newMsg.room_id
                                        ? { ...c, count: c.count + 1 }
                                        : c,
                                );
                            }
                            return [
                                ...old,
                                { room_id: newMsg.room_id, count: 1 },
                            ];
                        },
                    );
                },
            )
            // Слушаем обновления участников (сброс счетчика, если изменился last_read_at)
            // Обрабатывает синхронизацию с других устройств
            .on(
                'postgres_changes',
                {
                    event: REALTIME_EVENTS.UPDATE,
                    schema: 'public',
                    table: DB_TABLES.ROOM_MEMBERS,
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    // Если last_read_at изменился, повторно запрашиваем данные или сбрасываем оптимистично
                    // Повторный запрос надежнее для получения нуля
                    queryClient.invalidateQueries({
                        queryKey: ['unread_counts', user.id],
                    });
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient]);

    // Хелпер для получения количества для конкретной комнаты
    const getCount = (roomId: string) => {
        return counts.find((c) => c.room_id === roomId)?.count || 0;
    };

    return { counts, getCount };
}
