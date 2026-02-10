/**
 * Модуль генерации и работы с ключами через Web Crypto API.
 * Использует нативные браузерные реализации Ed25519 и X25519.
 */

// Псевдоним для удобства
const subtle = window.crypto.subtle;

/**
 * Генерирует пару ключей ECDSA P-256 (для подписей).
 * Ключи извлекаемы (extractable), чтобы можно было сохранить резервную копию.
 */
export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
    return (await subtle.generateKey(
        {
            name: "ECDSA",
            namedCurve: "P-256",
        },
        true, // extractable
        ["sign", "verify"],
    )) as CryptoKeyPair;
}

/**
 * Генерирует пару ключей ECDH P-256 (для шифрования/обмена).
 */
export async function generatePreKeyPair(): Promise<CryptoKeyPair> {
    return (await subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        true, // extractable
        ["deriveKey", "deriveBits"],
    )) as CryptoKeyPair;
}

/**
 * Выполняет ECDH для получения общего секрета (бит).
 */
export async function deriveSharedSecret(
    myPrivateKey: CryptoKey,
    theirPublicKey: CryptoKey,
): Promise<ArrayBuffer> {
    return await subtle.deriveBits(
        {
            name: "ECDH",
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
            name: "ECDSA",
            hash: { name: "SHA-256" },
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
            name: "ECDSA",
            hash: { name: "SHA-256" },
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
    return await subtle.exportKey("raw", key);
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
        algorithm === "ECDSA" ? ["verify"] : ["deriveKey", "deriveBits"];

    return await subtle.importKey(
        "raw",
        keyData as BufferSource,
        {
            name: algorithm,
            namedCurve: "P-256",
        },
        true,
        usage,
    );
}

// --- Утилиты ---

/**
 * Преобразует ArrayBuffer в Base64 строку.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Преобразует Base64 строку в ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
