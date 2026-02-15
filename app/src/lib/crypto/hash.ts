/**
 * Утилиты для хеширования данных.
 */

/**
 * Хеширует строку через SHA-256.
 * Используется для безопасного хранения PIN-кодов и других чувствительных данных.
 *
 * @param data - Строка для хеширования
 * @returns Хеш в формате hex-строки
 */
export async function sha256(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encodedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
