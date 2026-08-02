/**
 * Утилита для расшифровки контента сообщений.
 * Обрабатывает все edge-cases: удалённые сообщения, mock-режим, отсутствие IV.
 */
import { decryptMessage } from "@/lib/crypto/messages";
import type { MessageRow } from "@/lib/types/message";

/**
 * Расшифровывает контент сообщения.
 *
 * @param msg - Сырое сообщение из базы данных
 * @param roomKey - Ключ шифрования комнаты
 * @returns Расшифрованный текст или null (если сообщение удалено/нет данных)
 *
 * @example
 * ```ts
 * const content = await decryptMessagePayload(messageRow, roomKey);
 * if (content === null) {
 *   // Сообщение удалено или ошибка
 * }
 * ```
 */
export type DecryptMessagePayloadInput = Pick<
    MessageRow,
    "is_deleted" | "content" | "iv"
>;

export async function decryptMessagePayload(
    msg: DecryptMessagePayloadInput,
    roomKey: CryptoKey | undefined,
): Promise<string | null> {
    // Удалённое сообщение — возвращаем null
    if (msg.is_deleted || msg.content === null) {
        return null;
    }

    // Нет вектора инициализации — считаем это "сидом" (открытым сообщением)
    if (!msg.iv) {
        return msg.content || "";
    }

    // Нет ключа — невозможно расшифровать
    if (!roomKey) {
        return null;
    }

    // Выполняем расшифровку
    try {
        return await decryptMessage(msg.content, msg.iv, roomKey);
    } catch {
        if (import.meta.env.DEV) {
            // В DEV-режиме возвращаем оригинал для отладки
            return msg.content;
        }
        return "🔒 Ошибка расшифровки";
    }
}
