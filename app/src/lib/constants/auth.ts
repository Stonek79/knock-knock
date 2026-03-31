import type { KeyType } from "@/lib/crypto/keystore";

export const AUTH_MODES = {
    PASSWORD: "password",
} as const;

export const AUTH_VIEW_MODES = {
    LOGIN: "login",
    REGISTER: "register",
} as const;

/**
 * Типы ключей в Keystore (IndexedDB).
 * Привязаны к типу KeyType для обеспечения типобезопасности.
 */
export const KEYSTORE_TYPES = {
    IDENTITY: "identity",
    PREKEY: "prekey",
} as const satisfies Record<string, KeyType>;
