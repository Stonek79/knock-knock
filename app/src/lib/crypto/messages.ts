/**
 * Утилиты для шифрования сообщений.
 * Использует AES-GCM (256-bit) с симметричным ключом комнаты.
 */

import { arrayBufferToBase64, base64ToArrayBuffer } from "./keys";

const subtle = window.crypto.subtle;
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
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce for GCM

    const encryptedBuffer = await subtle.encrypt(
        {
            name: "AES-GCM",
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
    const encryptedBuffer = base64ToArrayBuffer(ciphertext);
    const ivBuffer = base64ToArrayBuffer(iv);

    const decryptedBuffer = await subtle.decrypt(
        {
            name: "AES-GCM",
            iv: ivBuffer,
        },
        key,
        encryptedBuffer,
    );

    return DECODER.decode(decryptedBuffer);
}
