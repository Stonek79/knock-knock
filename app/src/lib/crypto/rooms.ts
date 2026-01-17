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
 * Генерирует симметричный ключ комнаты (AES-GCM 256-bit).
 * Этот ключ будет использоваться для шифрования сообщений в комнате.
 */
export async function generateRoomKey(): Promise<CryptoKey> {
    return await subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256,
        },
        true, // extractable (нужен для экспорта/импорта другим участникам)
        ['encrypt', 'decrypt'],
    );
}

/**
 * Экспортирует ключ комнаты в raw формат (ArrayBuffer).
 * Полезно для отладки или низкоуровневых операций.
 */
export async function exportRoomKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
    return await subtle.exportKey('raw', key);
}

/**
 * Импортирует ключ комнаты из raw формата.
 */
export async function importRoomKeyRaw(
    keyData: ArrayBuffer,
): Promise<CryptoKey> {
    return await subtle.importKey('raw', keyData, { name: 'AES-GCM' }, true, [
        'encrypt',
        'decrypt',
    ]);
}
