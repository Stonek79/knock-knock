/**
 * Утилиты для шифрования сообщений.
 * Использует AES-GCM (256-bit) с симметричным ключом комнаты.
 */

import { CRYPTO_CONFIG, DEFAULT_MIME_TYPES } from "../constants";
import { arrayBufferToBase64, base64ToArrayBuffer } from "./keys";
import { cryptoProvider, subtleProvider } from "./provider";

const subtle = subtleProvider;
const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

/**
 * Зашифровывает текстовое сообщение.
 * @param content Открытый текст сообщения.
 * @param key Симметричный ключ комнаты (AES-GCM).
 * @returns Объект с зашифрованным текстом (Base64) и IV (Base64).
 */
export async function encryptMessage(
    content: string,
    key: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
    const encoded = ENCODER.encode(content);
    const iv = cryptoProvider.getRandomValues(
        new Uint8Array(CRYPTO_CONFIG.IV_LENGTH_BYTES),
    ); // 96-bit nonce for GCM

    const encryptedBuffer = await subtle.encrypt(
        {
            name: CRYPTO_CONFIG.ALGORITHM.AES_GCM,
            iv: iv,
        },
        key,
        encoded,
    );

    return {
        ciphertext: arrayBufferToBase64(encryptedBuffer),
        iv: arrayBufferToBase64(iv.buffer),
    };
}

/**
 * Расшифровывает текстовое сообщение.
 * @param ciphertext Зашифрованный текст (Base64).
 * @param iv Вектор инициализации (Base64).
 * @param key Симметричный ключ комнаты.
 * @returns Расшифрованный текст.
 */
export async function decryptMessage(
    ciphertext: string,
    iv: string,
    key: CryptoKey,
): Promise<string> {
    try {
        const encryptedBuffer = base64ToArrayBuffer(ciphertext);
        const ivBuffer = base64ToArrayBuffer(iv);

        const decryptedBuffer = await subtle.decrypt(
            {
                name: CRYPTO_CONFIG.ALGORITHM.AES_GCM,
                iv: ivBuffer,
            },
            key,
            encryptedBuffer,
        );

        return DECODER.decode(decryptedBuffer);
    } catch (err) {
        // В режиме разработки разрешаем возврат оригинального текста, если дешифровка не удалась.
        // Это необходимо для отображения сидированных (открытых) данных.
        if (import.meta.env.DEV) {
            return ciphertext;
        }
        throw err;
    }
}

/**
 * Зашифровывает бинарные данные (Blob).
 * Используется для аудиосообщений.
 * @param blob Исходный файл.
 * @param key Симметричный ключ комнаты.
 * @returns Зашифрованный Blob (первые 12 байт - IV, затем зашифрованные данные).
 */
export async function encryptBlob(blob: Blob, key: CryptoKey): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const iv = cryptoProvider.getRandomValues(
        new Uint8Array(CRYPTO_CONFIG.IV_LENGTH_BYTES),
    );

    const encryptedBuffer = await subtle.encrypt(
        {
            name: CRYPTO_CONFIG.ALGORITHM.AES_GCM,
            iv: iv,
        },
        key,
        arrayBuffer,
    );

    // Склеиваем IV и зашифрованные данные
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    return new Blob([combined], { type: DEFAULT_MIME_TYPES.OCTET_STREAM });
}

/**
 * Расшифровывает бинарные данные (Blob).
 * Полученные данные были зашифрованы функцией encryptBlob.
 * @param blob Зашифрованный Blob.
 * @param key Симметричный ключ комнаты.
 * @param mimeType Исходный MIME тип для восстановления Blob.
 * @returns Расшифрованный Blob.
 */
export async function decryptBlob(
    blob: Blob,
    key: CryptoKey,
    mimeType: string,
): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const combined = new Uint8Array(arrayBuffer);

    // Извлекаем IV (первые 12 байт)
    const iv = combined.slice(0, CRYPTO_CONFIG.IV_LENGTH_BYTES);
    const encryptedData = combined.slice(CRYPTO_CONFIG.IV_LENGTH_BYTES);

    const decryptedBuffer = await subtle.decrypt(
        {
            name: CRYPTO_CONFIG.ALGORITHM.AES_GCM,
            iv: iv,
        },
        key,
        encryptedData,
    );

    return new Blob([decryptedBuffer], { type: mimeType });
}
