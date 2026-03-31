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
export async function decryptMessagePayload(
    msg: MessageRow,
    roomKey: CryptoKey | undefined,
): Promise<string | null> {
    // Удалённое сообщение — возвращаем null
    if (msg.is_deleted || msg.content === null) {
        return null;
    }

    // Нет вектора инициализации — считаем это "сидом" (открытым сообщением)
    if (!msg.iv && msg.content) {
        return msg.content;
    }

    // Если всё ещё нет IV и сообщение не сид — невозможно расшифровать
    if (!msg.iv) {
        return null;
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
