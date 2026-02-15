/**
 * Константы для Ghost Mode (режима-призрака).
 */

export const GHOST_STATUS = {
    LOCKED: "locked",
    UNLOCKED: "unlocked",
    DECOY: "decoy",
} as const;

/** Ключ localStorage для хранения настроек Ghost Mode */
export const GHOST_STORAGE_KEY = "kk-ghost-mode";
