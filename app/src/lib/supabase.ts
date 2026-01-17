import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isSupabaseConfigured) {
    console.error(
        'Supabase is not configured. Creating a mock client to prevent crash.',
    );
}

// Создаем состояние для Mock Client (в памяти)
let mockSession: { user: { id: string; email: string } } | null = null;

// Создаем безопасный Mock, чтобы приложение работало без бекенда
const mockSupabase = {
    auth: {
        getSession: () =>
            Promise.resolve({
                data: { session: mockSession },
                error: null,
            }),
        onAuthStateChange: (
            callback: (
                event: string,
                session: { user: { id: string; email: string } } | null,
            ) => void,
        ) => {
            // Вызываем коллбек сразу с текущим состоянием
            callback(mockSession ? 'SIGNED_IN' : 'SIGNED_OUT', mockSession);
            return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signInWithOtp: ({ email }: { email: string }) => {
            console.log('[DevMode] Mock Login for:', email);
            // Эмулируем задержку и успешный вход
            setTimeout(() => {
                mockSession = {
                    user: {
                        id: 'dev-user-id',
                        email: email,
                    },
                };
                // Нужно бы триггернуть onAuthStateChange, но в простой реализации мы
                // полагаемся на то, что компоненты перезапросят getSession или
                // мы просто перезагрузим страницу.
                // Для MVP Dev Mode: просто вернем успех.
                // В идеале: Event Emitter.
                window.location.reload(); // Простой хак для обновления состояния auth store
            }, 500);

            return Promise.resolve({ data: {}, error: null });
        },
        signOut: () => {
            console.log('[DevMode] Mock SignOut');
            mockSession = null;
            window.location.reload();
            return Promise.resolve({ error: null });
        },
    },
    from: (table: string) => ({
        select: () => ({
            eq: () => ({
                single: () => {
                    console.log(`[DevMode] Select from ${table}`);
                    // Возвращаем фейковый профиль
                    if (table === 'profiles') {
                        return Promise.resolve({
                            data: {
                                id: 'dev-user-id',
                                username: 'Dev User',
                                display_name: 'Developer',
                                updated_at: new Date().toISOString(),
                            },
                            error: null,
                        });
                    }
                    return Promise.resolve({ data: null, error: null });
                },
            }),
        }),
        upsert: (data: unknown) => {
            console.log(`[DevMode] Upsert into ${table}:`, data);
            return Promise.resolve({ error: null });
        },
    }),
} as unknown as SupabaseClient;

/**
 * Глобальный клиент Supabase.
 * Если ключи отсутствуют, возвращается Mock, который эмулирует базовую работу.
 */
export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : mockSupabase;
