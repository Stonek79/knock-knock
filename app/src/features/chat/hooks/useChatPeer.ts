import { useQuery } from '@tanstack/react-query';
import { DB_TABLES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { RoomWithMembers } from '@/lib/types/room';

/**
 * Хук для загрузки данных собеседника в DM-чате.
 */
export function useChatPeer(
    otherUserId: string | undefined,
    roomType: RoomWithMembers['type'] | undefined,
) {
    return useQuery({
        queryKey: ['user', otherUserId],
        queryFn: async () => {
            if (!otherUserId) return null;

            // Mock режим: ищем в MOCK_USERS
            if (import.meta.env.VITE_USE_MOCK === 'true') {
                const { MOCK_USERS } = await import('@/lib/mock/data');
                return MOCK_USERS.find((u) => u.id === otherUserId) || null;
            }

            // Production: загружаем из Supabase
            const { data, error: profileError } = await supabase
                .from(DB_TABLES.PROFILES)
                .select('id, display_name, username, avatar_url')
                .eq('id', otherUserId)
                .single();

            if (profileError || !data) return null;
            return data;
        },
        enabled: !!otherUserId && roomType === 'direct',
    });
}
