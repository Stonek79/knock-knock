import { useQuery } from '@tanstack/react-query';
import { DB_TABLES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types/profile';

export function useContacts() {
    return useQuery({
        queryKey: ['contacts'],
        queryFn: async (): Promise<Profile[]> => {
            // 1. Mock Mode
            if (import.meta.env.VITE_USE_MOCK === 'true') {
                const { MOCK_USERS } = await import('@/lib/mock/data');
                // Приводим MockUser к Profile, предполагая совместимость или делаем маппинг
                return MOCK_USERS.map((u) => ({
                    id: u.id,
                    username: u.username,
                    display_name: u.display_name,
                    email: u.email,
                    avatar_url: u.avatar_url ?? null,
                    updated_at: new Date().toISOString(), // Mock value
                }));
            }

            // 2. Production Mode
            const { data, error } = await supabase
                .from(DB_TABLES.PROFILES)
                .select('*')
                .order('display_name', { ascending: true });

            if (error) throw error;
            return data as Profile[];
        },
        staleTime: 1000 * 60 * 5, // 5 минут
    });
}
