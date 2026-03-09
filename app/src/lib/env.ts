import { z } from "zod";

/**
 * Схема валидации переменных окружения приложения.
 * Гарантирует, что приложение не запустится без необходимых ключей или с неверным форматом URL.
 */
const envSchema = z.object({
    VITE_SUPABASE_URL: z.url("Некорректный URL Supabase"),
    VITE_SUPABASE_ANON_KEY: z.string().min(20, "Anon key слишком короткий"),
    VITE_USE_MOCK: z.enum(["true", "false"]).default("false"),
    // Опциональные переменные для разработки/тестирования
    VITE_DEV_MODE: z.string().optional(),
});

/**
 * Валидация текущих переменных окружения.
 * В случае ошибки приложение выбросит исключение при инициализации.
 */
const _env = envSchema.safeParse(import.meta.env);

if (!_env.success) {
    console.error("❌ Ошибка в переменных окружения:", _env.error.format());
    throw new Error("Некорректная конфигурация окружения");
}

export const env = _env.data;
