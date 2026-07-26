import { z } from "zod";

/**
 * Схема валидации переменных окружения приложения.
 */
const envSchema = z.object({
    /** URL инстанса PocketBase (например: https://api.whoami.ninja) */
    VITE_PB_URL: z
        .string()
        .min(1)
        .default("https://api.whoami.ninja")
        .refine((val) => val.startsWith("http"), {
            message: "URL PocketBase должен начинаться с http:// или https://",
        }),
    /** URL инстанса LiveKit (например: wss://whoami.ninja/livekit/) */
    VITE_LIVEKIT_URL: z
        .string()
        .min(1)
        .default("wss://whoami.ninja/livekit/")
        .refine((val) => val.startsWith("ws"), {
            message: "URL LiveKit должен начинаться с ws:// или wss://",
        }),
    /** Использовать ли моки вместо реального API */
    VITE_USE_MOCK: z.enum(["true", "false"]).optional().default("false"),
    /** Опциональные переменные для разработки */
    VITE_DEV_MODE: z.string().optional(),
});

/**
 * Валидация текущих переменных окружения.
 */
const _envResult = envSchema.safeParse(import.meta.env);

if (!_envResult.success) {
    console.group("⚠️ Внимание: Конфигурация окружения не идеальна");
    console.warn("Используются значения по умолчанию.");
    console.warn("Детали:", _envResult.error.format());
    console.groupEnd();
}

// Экспортируем данные. Если парсинг не удался — берем дефолтные значения из схемы.
export const env = _envResult.success
    ? _envResult.data
    : envSchema.parse({
          VITE_PB_URL: "https://api.whoami.ninja",
          VITE_LIVEKIT_URL: "wss://whoami.ninja/livekit/",
      });
