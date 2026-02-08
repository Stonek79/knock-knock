import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ProfileKeys {
    public_key_x25519: string | null;
    public_key_signing: string | null;
}

/**
 * Хук для получения публичных ключей пользователя.
 *
 * @param userId - ID пользователя
 * @returns { profileKeys, areKeysPublished, isLoading, error }
 */
export function useProfileKeys(userId: string | undefined) {
    const {
        data: profileKeys,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['profile-keys', userId],
        queryFn: async (): Promise<ProfileKeys | null> => {
            if (!userId) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('public_key_x25519, public_key_signing')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Failed to fetch profile keys', error);
                return null;
            }
            return data;
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 минут
    });

    // Проверяем, опубликованы ли уже ключи в профиле
    const areKeysPublished = !!(
        profileKeys?.public_key_x25519 && profileKeys?.public_key_signing
    );

    return {
        profileKeys,
        areKeysPublished,
        isLoading,
        error,
    };
}
