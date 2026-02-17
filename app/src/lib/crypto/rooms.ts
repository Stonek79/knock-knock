/**
 * Криптографические утилиты для безопасности комнат.
 * Включает генерацию ID комнат и симметричных ключей (AES-GCM).
 */

const subtle = window.crypto.subtle;

/**
 * Генерирует криптографически стойкий ID комнаты.
 * Используем UUID v4, так как это стандарт де-факто для ID.
 */
export function generateRoomId(): string {
    return crypto.randomUUID();
}

/**
 * Генерирует детерминированный ID комнаты на основе ID пользователя.
 * Используется для "Избранного" (Saved Messages), чтобы ID был предсказуемым.
 * Используем SHA-256 от userId и форматируем как UUID.
 */
export async function generateDeterministicRoomId(
    userId: string,
): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`self-chat:${userId}`);
    const hash = await subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(hash);

    // Форматируем под UUID v4 (почти, главное структура)
    // xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
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
