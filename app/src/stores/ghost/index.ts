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
import { GHOST_STATUS, GHOST_STORAGE_KEY } from "@/lib/constants";
import { sha256 } from "@/lib/crypto";
import type { GhostStatus } from "@/lib/types";

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

/**
 * Стор для управления функционалом Ghost Mode.
 */
export const useGhostStore = create<GhostState>()(
    persist(
        (set, get) => ({
            enabled: false,
            pinHash: null,
            decoyPinHash: null,
            status: GHOST_STATUS.UNLOCKED,

            setPin: async (pin: string) => {
                const hash = await sha256(pin);
                set({
                    pinHash: hash,
                    enabled: true,
                    status: GHOST_STATUS.LOCKED,
                });
            },

            setDecoyPin: async (pin: string) => {
                const hash = await sha256(pin);
                set({ decoyPinHash: hash });
            },

            unlock: async (pin: string) => {
                const state = get();
                const inputHash = await sha256(pin);

                // Проверяем основной PIN
                if (inputHash === state.pinHash) {
                    set({ status: GHOST_STATUS.UNLOCKED });
                    return true;
                }

                // Проверяем ложный PIN
                if (state.decoyPinHash && inputHash === state.decoyPinHash) {
                    set({ status: GHOST_STATUS.DECOY });
                    return true;
                }

                return false;
            },

            lock: () => {
                const state = get();
                if (state.enabled) {
                    set({ status: GHOST_STATUS.LOCKED });
                }
            },

            disable: () => {
                set({
                    enabled: false,
                    pinHash: null,
                    decoyPinHash: null,
                    status: GHOST_STATUS.UNLOCKED,
                });
            },

            isDecoy: () => get().status === GHOST_STATUS.DECOY,
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
