import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

type PresenceState = {
    [key: string]: {
        online_at: string;
        user_id: string;
    }[];
};

/**
 * Хук для отслеживания онлайн-статуса пользователей.
 * Подписывается на глобальный канал presence.
 */
export function usePresence() {
    // Map: userId -> 'online' | 'offline'
    const [onlineUsers, setOnlineUsers] = useState<
        Record<string, 'online' | 'offline'>
    >({});
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user) return;

        // 1. Mock Mode
        if (import.meta.env.VITE_USE_MOCK === 'true') {
            // В мок-режиме, сделаем вид, что некоторые юзеры онлайн
            // (Можно брать из MOCK_USERS, но для простоты захардкодим логику)
            setOnlineUsers({
                'user-2': 'online', // Elon
                'user-3': 'online', // Pavel
                [user.id]: 'online',
            });
            return;
        }

        // 2. Production Mode (Supabase Realtime)
        const channel = supabase.channel('global_presence', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState() as PresenceState;
                const newOnlineMap: Record<string, 'online' | 'offline'> = {};

                Object.keys(state).forEach((userId) => {
                    newOnlineMap[userId] = 'online';
                });

                setOnlineUsers(newOnlineMap);
            })
            .on('presence', { event: 'join' }, ({ key }) => {
                setOnlineUsers((prev) => ({ ...prev, [key]: 'online' }));
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                setOnlineUsers((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        user_id: user.id,
                    });
                }
            });

        return () => {
            // un-track handled gracefully by channel leave
            supabase.removeChannel(channel);
        };
    }, [user]);

    return onlineUsers;
}
