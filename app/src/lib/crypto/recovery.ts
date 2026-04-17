/**
 * Модуль восстановления и резервного копирования ключей.
 * Использует PBKDF2 для деривации ключа шифрования из пароля
 * и AES-GCM для защиты данных.
 */
import { CRYPTO_CONFIG, ERROR_CODES } from "../constants";
import type { AppError, Result } from "../types/result";
import { appError, err, ok } from "../utils/result";
import { arrayBufferToBase64, base64ToArrayBuffer } from "./keys";
import { cryptoProvider, subtleProvider } from "./provider";

const subtle = subtleProvider;

/**
 * Формат зашифрованного бэкапа ключей.
 * Представляет собой JSON, упакованный в Base64.
 */
export interface KeyBackup {
    version: number;
    salt: string; // Base64
    iv: string; // Base64
    data: string; // Base64 (зашифрованный JSON с ключами JWK)
}

/** Внутренняя структура данных для шифрования */
interface BackupPayload {
    identity: {
        private: JsonWebKey;
        public: JsonWebKey;
    };
    prekey: {
        private: JsonWebKey;
        public: JsonWebKey;
    };
}

// Утилиты перенесены в keys.ts

/**
 * Генерирует ключ шифрования из пароля.
 */
async function getKeyFromPassword(
    password: string,
    salt: Uint8Array,
): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const passwordBuffer = enc.encode(password);
    const keyMaterial = await subtle.importKey(
        CRYPTO_CONFIG.FORMAT.RAW,
        passwordBuffer,
        { name: CRYPTO_CONFIG.ALGORITHM.PBKDF2 },
        false,
        [CRYPTO_CONFIG.USAGE.DERIVE_KEY],
    );

    return await subtle.deriveKey(
        {
            name: CRYPTO_CONFIG.ALGORITHM.PBKDF2,
            salt: salt as BufferSource,
            iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
            hash: CRYPTO_CONFIG.ALGORITHM.SHA_256,
        },
        keyMaterial,
        { name: CRYPTO_CONFIG.ALGORITHM.AES_GCM, length: 256 },
        false,
        CRYPTO_CONFIG.USAGE.ENCRYPT_DECRYPT,
    );
}

/**
 * Создает зашифрованный бэкап ключей.
 */
export async function createBackup(
    password: string,
    identityPair: { privateKey: CryptoKey; publicKey: CryptoKey },
    preKeyPair: { privateKey: CryptoKey; publicKey: CryptoKey },
): Promise<KeyBackup> {
    // 1. Экспортируем ключи в JWK
    const payload: BackupPayload = {
        identity: {
            private: await subtle.exportKey(
                CRYPTO_CONFIG.FORMAT.JWK,
                identityPair.privateKey,
            ),
            public: await subtle.exportKey(
                CRYPTO_CONFIG.FORMAT.JWK,
                identityPair.publicKey,
            ),
        },
        prekey: {
            private: await subtle.exportKey(
                CRYPTO_CONFIG.FORMAT.JWK,
                preKeyPair.privateKey,
            ),
            public: await subtle.exportKey(
                CRYPTO_CONFIG.FORMAT.JWK,
                preKeyPair.publicKey,
            ),
        },
    };

    // 2. Готовим данные
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const salt = cryptoProvider.getRandomValues(new Uint8Array(16));
    const iv = cryptoProvider.getRandomValues(new Uint8Array(12));

    // 3. Шифруем
    const key = await getKeyFromPassword(password, salt);
    const ciphertext = await subtle.encrypt(
        {
            name: CRYPTO_CONFIG.ALGORITHM.AES_GCM,
            iv: iv,
        },
        key,
        plaintext,
    );

    // 4. Формируем результат
    const backup: KeyBackup = {
        version: 1,
        salt: arrayBufferToBase64(salt.buffer),
        iv: arrayBufferToBase64(iv.buffer),
        data: arrayBufferToBase64(ciphertext),
    };

    return backup;
}

/**
 * Ошибки, возможные при восстановлении бэкапа
 */
export type RecoveryError =
    | AppError<typeof ERROR_CODES.UNSUPPORTED_VERSION>
    | AppError<typeof ERROR_CODES.DECRYPT_FAILED, Error>
    | AppError<typeof ERROR_CODES.INVALID_BACKUP, Error>;

/**
 * Быстрый тип для возврата восстановленных ключей
 */
export interface RestoredKeys {
    identity: { privateKey: CryptoKey; publicKey: CryptoKey };
    prekey: { privateKey: CryptoKey; publicKey: CryptoKey };
}

/**
 * Восстанавливает ключи из бэкапа.
 */
export async function restoreBackup(
    backup: KeyBackup,
    password: string,
): Promise<Result<RestoredKeys, RecoveryError>> {
    if (backup.version !== 1) {
        return err(
            appError(
                ERROR_CODES.UNSUPPORTED_VERSION,
                "Неподдерживаемая версия бэкапа",
            ),
        );
    }

    try {
        const salt = new Uint8Array(base64ToArrayBuffer(backup.salt));
        const iv = new Uint8Array(base64ToArrayBuffer(backup.iv));
        const ciphertext = base64ToArrayBuffer(backup.data);

        // 1. Деривация ключа
        const key = await getKeyFromPassword(password, salt);

        // 2. Расшифровка
        const plaintextBuffer = await subtle.decrypt(
            {
                name: CRYPTO_CONFIG.ALGORITHM.AES_GCM,
                iv: iv,
            },
            key,
            ciphertext,
        );

        // 3. Парсинг JSON
        const plaintext = new TextDecoder().decode(plaintextBuffer);
        const payload: BackupPayload = JSON.parse(plaintext);

        // 4. Импорт ключей (JWK -> CryptoKey)
        const identityPrivate = await subtle.importKey(
            CRYPTO_CONFIG.FORMAT.JWK,
            payload.identity.private,
            { name: CRYPTO_CONFIG.ALGORITHM.ED25519 },
            true,
            [CRYPTO_CONFIG.USAGE.SIGN],
        );
        const identityPublic = await subtle.importKey(
            CRYPTO_CONFIG.FORMAT.JWK,
            payload.identity.public,
            { name: CRYPTO_CONFIG.ALGORITHM.ED25519 },
            true,
            [CRYPTO_CONFIG.USAGE.VERIFY],
        );

        const prekeyPrivate = await subtle.importKey(
            CRYPTO_CONFIG.FORMAT.JWK,
            payload.prekey.private,
            { name: CRYPTO_CONFIG.ALGORITHM.X25519 },
            true,
            CRYPTO_CONFIG.USAGE.DERIVE,
        );
        const prekeyPublic = await subtle.importKey(
            CRYPTO_CONFIG.FORMAT.JWK,
            payload.prekey.public,
            { name: CRYPTO_CONFIG.ALGORITHM.X25519 },
            true,
            [],
        );

        return ok({
            identity: {
                privateKey: identityPrivate,
                publicKey: identityPublic,
            },
            prekey: { privateKey: prekeyPrivate, publicKey: prekeyPublic },
        });
    } catch (e) {
        console.error("Backup restore failed:", e);
        if (e instanceof Error && e.name === "OperationError") {
            return err(
                appError(
                    ERROR_CODES.DECRYPT_FAILED,
                    "Не удалось расшифровать бэкап. Неверный пароль?",
                    e,
                ),
            );
        }
        return err(
            appError(
                ERROR_CODES.INVALID_BACKUP,
                "Ошибка парсинга данных бэкапа",
                e instanceof Error ? e : undefined,
            ),
        );
    }
}
