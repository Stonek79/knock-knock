/**
 * Утилиты для шифрования сообщений.
 * Использует AES-GCM (256-bit) с симметричным ключом комнаты.
 */

import { DEFAULT_MIME_TYPES } from "../constants";
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

/**
 * Зашифровывает бинарные данные (Blob).
 * Используется для аудиосообщений.
 * @param blob Исходный файл.
 * @param key Симметричный ключ комнаты.
 * @returns Зашифрованный Blob (первые 12 байт - IV, затем зашифрованные данные).
 */
export async function encryptBlob(blob: Blob, key: CryptoKey): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await subtle.encrypt(
        {
            name: "AES-GCM",
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
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    const decryptedBuffer = await subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        encryptedData,
    );

    return new Blob([decryptedBuffer], { type: mimeType });
}
