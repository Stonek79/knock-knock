/**
 * Утилита для расшифровки контента сообщений.
 * Обрабатывает все edge-cases: удалённые сообщения, mock-режим, отсутствие IV.
 */
import { decryptMessage } from "@/lib/crypto/messages";
import { isMock } from "@/lib/supabase";
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

    // В mock-режиме шифрование не используется
    if (isMock) {
        return msg.content;
    }

    // Нет вектора инициализации — невозможно расшифровать
    if (!msg.iv) {
        return null;
    }

    // Нет ключа — невозможно расшифровать
    if (!roomKey) {
        return null;
    }

    // Выполняем расшифровку
    return await decryptMessage(msg.content, msg.iv, roomKey);
}
