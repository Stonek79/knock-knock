/**
 * Криптографические утилиты для безопасности комнат.
 * Включает генерацию ID комнат и симметричных ключей (AES-GCM).
 */

const subtle = window.crypto.subtle;

/**
 * Генерирует криптографически стойкий ID комнаты.
 * PocketBase по умолчанию использует 15-символьные алфавитно-цифровые строки.
 */
export function generateRoomId(): string {
    // Генерируем 10 байт (80 бит), что дает ~16 символов в hex или ~15 в custom base
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    return Array.from(bytes)
        .map((b) => b.toString(36))
        .join("")
        .slice(0, 15);
}

export async function generateDeterministicRoomId(
    userId: string,
): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`self-chat:${userId}`);
    const hash = await subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(hash);

    // Используем base36 для компактности и попадания в 15 символов
    return Array.from(bytes)
        .map((b) => b.toString(36))
        .join("")
        .slice(0, 15);
}

/**
 * Генерирует симметричный ключ комнаты (AES-GCM 256-bit).
 * Этот ключ будет использоваться для шифрования сообщений в комнате.
 */
export async function generateRoomKey(): Promise<CryptoKey> {
    return await subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true, // extractable (нужен для экспорта/импорта другим участникам)
        ["encrypt", "decrypt"],
    );
}

/**
 * Экспортирует ключ комнаты в raw формат (ArrayBuffer).
 * Полезно для отладки или низкоуровневых операций.
 */
export async function exportRoomKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
    return await subtle.exportKey("raw", key);
}

/**
 * Импортирует ключ комнаты из raw формата.
 */
export async function importRoomKeyRaw(
    keyData: ArrayBuffer,
): Promise<CryptoKey> {
    return await subtle.importKey("raw", keyData, { name: "AES-GCM" }, true, [
        "encrypt",
        "decrypt",
    ]);
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
    const hash = await subtle.digest("SHA-256", data);

    return await subtle.importKey("raw", hash, { name: "AES-GCM" }, true, [
        "encrypt",
        "decrypt",
    ]);
}
