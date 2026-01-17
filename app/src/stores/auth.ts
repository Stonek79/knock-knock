import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import i18n from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

interface AuthState {
    /** Текущая сессия пользователя Supabase */
    session: Session | null;
    /** Объект пользователя */
    user: User | null;
    /** Флаг загрузки (инициализации) */
    loading: boolean;
    /** Инициализация слушателя состояния авторизации */
    initialize: () => Promise<void>;
    /** Выход из системы */
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    loading: true,
    initialize: async () => {
        try {
            // Получаем начальную сессию
            const {
                data: { session },
            } = await supabase.auth.getSession();
            set({ session, user: session?.user ?? null, loading: false });

            // Слушаем изменения состояния
            supabase.auth.onAuthStateChange((_event, session) => {
                set({ session, user: session?.user ?? null, loading: false });
            });
        } catch (error) {
            console.error(i18n.t('auth.initializationError'), error);
            set({ loading: false });
        }
    },
    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
    },
}));
