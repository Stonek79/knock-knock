import {
    createClient as createSupabaseClient,
    type SupabaseClient,
} from "@supabase/supabase-js";
import { env } from "./env";
import { createClient as createMockClient } from "./mock/client";
import type { Database } from "./types/database.types";

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

// Определяем режим работы: настоящий или мок
const useMock = env.VITE_USE_MOCK === "true";

// Экспортируем флаг для использования в других частях приложения (например, для отключения криптографии)
export const isMock = useMock;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Создаем инстанс клиента
export const supabase: SupabaseClient<Database> =
    useMock || !isSupabaseConfigured
        ? createMockClient()
        : createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
