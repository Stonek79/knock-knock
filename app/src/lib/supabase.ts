import {
	createClient as createSupabaseClient,
	type SupabaseClient,
} from "@supabase/supabase-js";
import { createClient as createMockClient } from "./mock/client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Определяем режим работы: настоящий или мок
const useMock = import.meta.env.VITE_USE_MOCK === "true";

// Экспортируем флаг для использования в других частях приложения (например, для отключения криптографии)
export const isMock = useMock;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Создаем инстанс клиента
export const supabase: SupabaseClient =
	useMock || !isSupabaseConfigured
		? createMockClient()
		: createSupabaseClient(supabaseUrl, supabaseAnonKey);
