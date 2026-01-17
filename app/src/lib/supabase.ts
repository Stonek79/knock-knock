import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // Выбрасываем ошибку только в разработке или если это критично
    console.error('Missing Supabase Environment Variables');
}

/**
 * Глобальный клиент Supabase.
 * Используется для доступа к Auth, DB и Realtime.
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
