/**
 * Константы для работы с Supabase Realtime и инфраструктурой.
 */

/**
 * Статусы подписки на канал (Realtime Channel Status).
 */
export const CHANNEL_STATUS = {
    SUBSCRIBED: "SUBSCRIBED",
    TIMED_OUT: "TIMED_OUT",
    CLOSED: "CLOSED",
    CHANNEL_ERROR: "CHANNEL_ERROR",
} as const;
