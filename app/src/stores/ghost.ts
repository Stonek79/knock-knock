/**
 * Стор Ghost Mode (режим-призрак).
 *
 * Управляет состоянием PIN-кода для защиты приложения.
 * Поддерживает два PIN-кода:
 * - Основной: открывает реальный интерфейс
 * - Ложный (decoy): показывает пустой интерфейс без данных
 *
 * PIN хранится в localStorage в хешированном виде (SHA-256).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Ключи localStorage для Ghost Mode */
const GHOST_STORAGE_KEY = "kk-ghost-mode";

/** Статусы Ghost Mode */
type GhostStatus = "locked" | "unlocked" | "decoy";

/**
 * Хеширует PIN через SHA-256 для безопасного хранения.
 * Никогда не храним PIN в открытом виде.
 */
async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

interface GhostState {
    /** Активен ли Ghost Mode (установлен PIN) */
    enabled: boolean;
    /** Хеш основного PIN */
    pinHash: string | null;
    /** Хеш ложного PIN (decoy) */
    decoyPinHash: string | null;
    /** Текущий статус: заблокирован / разблокирован / ложный вход */
    status: GhostStatus;

    /** Установить основной PIN */
    setPin: (pin: string) => Promise<void>;
    /** Установить ложный PIN */
    setDecoyPin: (pin: string) => Promise<void>;
    /** Проверить PIN и разблокировать */
    unlock: (pin: string) => Promise<boolean>;
    /** Заблокировать (выход) */
    lock: () => void;
    /** Отключить Ghost Mode */
    disable: () => void;
    /** Проверяет, является ли текущая сессия ложной */
    isDecoy: () => boolean;
}

export const useGhostStore = create<GhostState>()(
    persist(
        (set, get) => ({
            enabled: false,
            pinHash: null,
            decoyPinHash: null,
            status: "unlocked" as GhostStatus,

            setPin: async (pin: string) => {
                const hash = await hashPin(pin);
                set({
                    pinHash: hash,
                    enabled: true,
                    status: "locked",
                });
            },

            setDecoyPin: async (pin: string) => {
                const hash = await hashPin(pin);
                set({ decoyPinHash: hash });
            },

            unlock: async (pin: string) => {
                const state = get();
                const inputHash = await hashPin(pin);

                // Проверяем основной PIN
                if (inputHash === state.pinHash) {
                    set({ status: "unlocked" });
                    return true;
                }

                // Проверяем ложный PIN
                if (state.decoyPinHash && inputHash === state.decoyPinHash) {
                    set({ status: "decoy" });
                    return true;
                }

                return false;
            },

            lock: () => {
                const state = get();
                if (state.enabled) {
                    set({ status: "locked" });
                }
            },

            disable: () => {
                set({
                    enabled: false,
                    pinHash: null,
                    decoyPinHash: null,
                    status: "unlocked",
                });
            },

            isDecoy: () => get().status === "decoy",
        }),
        {
            name: GHOST_STORAGE_KEY,
            // Не персистим status — при перезагрузке всегда locked
            partialize: (state) => ({
                enabled: state.enabled,
                pinHash: state.pinHash,
                decoyPinHash: state.decoyPinHash,
            }),
        },
    ),
);
