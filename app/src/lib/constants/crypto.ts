/** Настройки шифрования и криптографических алгоритмов */
export const CRYPTO_CONFIG = {
    ALGORITHM: {
        AES_GCM: "AES-GCM",
        ECDH: "ECDH",
        ECDSA: "ECDSA",
        SHA_256: "SHA-256",
        PBKDF2: "PBKDF2",
        ED25519: "Ed25519",
        X25519: "X25519",
    },
    CURVE: {
        P_256: "P-256",
    },
    FORMAT: {
        RAW: "raw",
        JWK: "jwk",
    },
    USAGE: {
        ENCRYPT_DECRYPT: ["encrypt", "decrypt"] as KeyUsage[],
        SIGN_VERIFY: ["sign", "verify"] as KeyUsage[],
        DERIVE: ["deriveKey", "deriveBits"] as KeyUsage[],
        // Индивидуальные значения, если нужны
        ENCRYPT: "encrypt" as KeyUsage,
        DECRYPT: "decrypt" as KeyUsage,
        SIGN: "sign" as KeyUsage,
        VERIFY: "verify" as KeyUsage,
        DERIVE_KEY: "deriveKey" as KeyUsage,
        DERIVE_BITS: "deriveBits" as KeyUsage,
    },
    IV_LENGTH_BYTES: 12,
    SALT_LENGTH_BYTES: 16,
    PBKDF2_ITERATIONS: 100000,
    AES_KEY_LENGTH_BITS: 256,
    ROOM_ID_BYTES: 10,
    ROOM_ID_LENGTH: 15,
} as const;
