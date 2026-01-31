import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { DB_TABLES } from '@/lib/constants';
import i18n from '@/lib/i18n';
import { MOCK_USERS } from '@/lib/mock/data';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types/profile';

interface AuthState {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
    fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    profile: null,
    loading: true,
    initialize: async () => {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            set({ session, user: session?.user ?? null });

            if (session?.user) {
                await get().fetchProfile();
            } else {
                set({ loading: false });
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (_event, session) => {
                const currentUser = get().user;
                const newUser = session?.user ?? null;

                set({ session, user: newUser });

                if (newUser && newUser.id !== currentUser?.id) {
                    set({ loading: true });
                    await get().fetchProfile();
                } else if (!newUser) {
                    set({ profile: null, loading: false });
                }
            });
        } catch (error) {
            console.error(i18n.t('auth.initializationError'), error);
            set({ loading: false });
        }
    },
    fetchProfile: async () => {
        const user = get().user;
        if (!user) return;

        // CHECK MOCK USERS FIRST
        const mockUser = MOCK_USERS.find((u) => u.id === user.id);
        if (mockUser) {
            // Adapt mock user to Profile type
            const profile: Profile = {
                id: mockUser.id,
                username: mockUser.username,
                display_name: mockUser.display_name,
                avatar_url: mockUser.avatar_url ?? null,
                role: mockUser.role, // Pass the role!
                created_at: new Date().toISOString(),
                status: 'online',
                last_seen: new Date().toISOString(),
                is_agreed_to_rules: true,
                banned_until: null,
            };
            set({ profile, loading: false });
            return;
        }

        try {
            const { data, error } = await supabase
                .from(DB_TABLES.PROFILES)
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            set({ profile: data as Profile, loading: false });
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            set({ loading: false });
        }
    },
    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null, profile: null });
    },
}));
