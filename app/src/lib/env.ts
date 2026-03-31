import { z } from "zod";

/**
 * Схема валидации переменных окружения приложения.
 * Гарантирует, что приложение не запустится без необходимых ключей или с неверным форматом URL.
 *
 * PocketBase требует только один URL — авторизация хранится в pb.authStore (localStorage).
 */
const envSchema = z.object({
    /** URL инстанса PocketBase (например: https://api.knok-knok.ru) */
    VITE_PB_URL: z.url("Некорректный URL PocketBase"),
    /** Использовать ли моки вместо реального API */
    VITE_USE_MOCK: z.enum(["true", "false"]).optional().default("false"),
    /** Опциональные переменные для разработки */
    VITE_DEV_MODE: z.string().optional(),
});

/**
 * Валидация текущих переменных окружения.
 * В случае ошибки приложение выбросит исключение при инициализации.
 */
const _env = envSchema.safeParse(import.meta.env);

if (!_env.success) {
    console.error(
        "❌ Ошибка в переменных окружения:",
        z.treeifyError(_env.error),
    );
    throw new Error("Некорректная конфигурация окружения");
}

export const env = _env.data;
