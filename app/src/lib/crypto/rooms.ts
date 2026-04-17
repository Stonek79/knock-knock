/**
 * Криптографические утилиты для безопасности комнат.
 * Включает генерацию ID комнат и симметричных ключей (AES-GCM).
 */

import { CRYPTO_CONFIG } from "../constants";
import { cryptoProvider, subtleProvider } from "./provider";

const subtle = subtleProvider;

/**
 * Генерирует криптографически стойкий ID комнаты.
 * PocketBase по умолчанию использует 15-символьные алфавитно-цифровые строки.
 */
export function generateRoomId(): string {
    // Генерируем 10 байт (80 бит), что дает ~16 символов в hex или ~15 в custom base
    const bytes = cryptoProvider.getRandomValues(
        new Uint8Array(CRYPTO_CONFIG.ROOM_ID_BYTES),
    );
    return Array.from(bytes)
        .map((b) => b.toString(36))
        .join("")
        .slice(0, CRYPTO_CONFIG.ROOM_ID_LENGTH);
}

/**
 * Генерирует детерминированный ID комнаты для чата с самим собой (Self-Chat).
 * Это гарантирует, что у пользователя всегда будет одна и та же комната для заметок.
 *
 * @param {string} userId - ID пользователя.
 * @returns {Promise<string>} Детерминированный ID комнаты (15 символов).
 */
export async function generateDeterministicRoomId(
    userId: string,
): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`self-chat:${userId}`);
    const hash = await subtle.digest(CRYPTO_CONFIG.ALGORITHM.SHA_256, data);
    const bytes = new Uint8Array(hash);

    // Используем base36 для компактности и попадания в 15 символов
    return Array.from(bytes)
        .map((b) => b.toString(36))
        .join("")
        .slice(0, CRYPTO_CONFIG.ROOM_ID_LENGTH);
}

/**
 * Генерирует симметричный ключ комнаты (AES-GCM 256-bit).
 * Этот ключ будет использоваться для шифрования сообщений в комнате.
 */
export async function generateRoomKey(): Promise<CryptoKey> {
    return await subtle.generateKey(
        {
            name: CRYPTO_CONFIG.ALGORITHM.AES_GCM,
            length: 256,
        },
        true, // extractable (нужен для экспорта/импорта другим участникам)
        CRYPTO_CONFIG.USAGE.ENCRYPT_DECRYPT,
    );
}

/**
 * Экспортирует ключ комнаты в raw формат (ArrayBuffer).
 * Полезно для отладки или низкоуровневых операций.
 */
export async function exportRoomKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
    return await subtle.exportKey(CRYPTO_CONFIG.FORMAT.RAW, key);
}

/**
 * Импортирует ключ комнаты из raw формата.
 */
export async function importRoomKeyRaw(
    keyData: ArrayBuffer,
): Promise<CryptoKey> {
    return await subtle.importKey(
        CRYPTO_CONFIG.FORMAT.RAW,
        keyData,
        { name: CRYPTO_CONFIG.ALGORITHM.AES_GCM },
        true,
        CRYPTO_CONFIG.USAGE.ENCRYPT_DECRYPT,
    );
}
/**
 * Генерирует детерминированный ключ комнаты на основе roomId.
 * Используется ТОЛЬКО в DEV-режиме для FALLBACK, когда реальные ключи отсутствуют.
 * Гарантирует стабильность истории сообщений в процессе разработки.
 */
export async function generateDeterministicRoomKey(
    roomId: string,
): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`dev-room-key-v1:${roomId}`);
    const hash = await subtle.digest(CRYPTO_CONFIG.ALGORITHM.SHA_256, data);

    return await subtle.importKey(
        CRYPTO_CONFIG.FORMAT.RAW,
        hash,
        { name: CRYPTO_CONFIG.ALGORITHM.AES_GCM },
        true,
        CRYPTO_CONFIG.USAGE.ENCRYPT_DECRYPT,
    );
}
