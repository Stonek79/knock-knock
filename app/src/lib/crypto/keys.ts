/**
 * Модуль генерации и работы с ключами через Web Crypto API.
 * Использует нативные браузерные реализации Ed25519 и X25519.
 */

// Псевдоним для удобства
import { CRYPTO_CONFIG } from "../constants";
import { subtleProvider } from "./provider";

const subtle = subtleProvider;

/**
 * Генерирует пару ключей ECDSA P-256 (для подписей).
/**
 * Генерирует основную пару ключей пользователя (Identity Key Pair).
 * Используется алгоритм ECDSA на кривой P-256 для создания цифровых подписей.
 * Ключи извлекаемы (extractable), чтобы можно было сохранить резервную копию.
 * 
 * @returns {Promise<CryptoKeyPair>} Пара ключей (публичный и приватный).
 */
export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
    return (await subtle.generateKey(
        {
            name: CRYPTO_CONFIG.ALGORITHM.ECDSA,
            namedCurve: CRYPTO_CONFIG.CURVE.P_256,
        },
        true, // extractable
        CRYPTO_CONFIG.USAGE.SIGN_VERIFY,
    )) as CryptoKeyPair;
}

/**
 * Генерирует пару ключей для обмена секретами (PreKey Pair).
 * Используется алгоритм ECDH на кривой P-256.
 *
 * @returns {Promise<CryptoKeyPair>} Пара ключей (публичный и приватный).
 */
export async function generatePreKeyPair(): Promise<CryptoKeyPair> {
    return (await subtle.generateKey(
        {
            name: CRYPTO_CONFIG.ALGORITHM.ECDH,
            namedCurve: CRYPTO_CONFIG.CURVE.P_256,
        },
        true, // extractable
        CRYPTO_CONFIG.USAGE.DERIVE,
    )) as CryptoKeyPair;
}

/**
 * Вычисляет общий секрет (Shared Secret) между двумя пользователями.
 * Использует ECDH на основе приватного ключа одного и публичного ключа другого.
 *
 * @param {CryptoKey} myPrivateKey - Свой приватный ключ ECDH.
 * @param {CryptoKey} theirPublicKey - Публичный ключ собеседника ECDH.
 * @returns {Promise<ArrayBuffer>} Общий секрет (32 байта).
 */
export async function deriveSharedSecret(
    myPrivateKey: CryptoKey,
    theirPublicKey: CryptoKey,
): Promise<ArrayBuffer> {
    return await subtle.deriveBits(
        {
            name: CRYPTO_CONFIG.ALGORITHM.ECDH,
            public: theirPublicKey,
        },
        myPrivateKey,
        256, // 32 bytes
    );
}

/**
 * Подписывает сообщение с помощью ECDSA.
 */
export async function signMessage(
    message: Uint8Array | ArrayBuffer,
    privateKey: CryptoKey,
): Promise<ArrayBuffer> {
    return await subtle.sign(
        {
            name: CRYPTO_CONFIG.ALGORITHM.ECDSA,
            hash: { name: CRYPTO_CONFIG.ALGORITHM.SHA_256 },
        },
        privateKey,
        message as BufferSource,
    );
}

/**
 * Проверяет подпись ECDSA.
 */
export async function verifySignature(
    message: Uint8Array | ArrayBuffer,
    signature: Uint8Array | ArrayBuffer,
    publicKey: CryptoKey,
): Promise<boolean> {
    return await subtle.verify(
        {
            name: CRYPTO_CONFIG.ALGORITHM.ECDSA,
            hash: { name: CRYPTO_CONFIG.ALGORITHM.SHA_256 },
        },
        publicKey,
        signature as BufferSource,
        message as BufferSource,
    );
}

/**
 * Экспортирует публичный ключ в Raw формат (байты).
 */
export async function exportPublicKey(key: CryptoKey): Promise<ArrayBuffer> {
    return await subtle.exportKey(CRYPTO_CONFIG.FORMAT.RAW, key);
}

/**
 * Импортирует публичный ключ из Raw формата.
 * @param keyData - Байты ключа
 * @param algorithm - 'ECDSA' или 'ECDH'
 */
export async function importPublicKey(
    keyData: ArrayBuffer | Uint8Array,
    algorithm: "ECDSA" | "ECDH",
): Promise<CryptoKey> {
    const usage: KeyUsage[] =
        algorithm === CRYPTO_CONFIG.ALGORITHM.ECDSA
            ? CRYPTO_CONFIG.USAGE.SIGN_VERIFY
            : CRYPTO_CONFIG.USAGE.DERIVE;

    return await subtle.importKey(
        CRYPTO_CONFIG.FORMAT.RAW,
        keyData as BufferSource,
        {
            name: algorithm,
            namedCurve: CRYPTO_CONFIG.CURVE.P_256,
        },
        true,
        usage,
    );
}

// --- Утилиты ---

/**
 * Преобразует ArrayBuffer в Base64 строку.
 * Безопасно для использования в браузерном окружении и Web Workers.
 *
 * @param {ArrayBuffer} buffer - Исходные бинарные данные.
 * @returns {string} Строка в формате Base64.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Преобразует Base64 строку назад в бинарный ArrayBuffer.
 *
 * @param {string} base64 - Строка в формате Base64.
 * @returns {ArrayBuffer} Бинарные данные.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
