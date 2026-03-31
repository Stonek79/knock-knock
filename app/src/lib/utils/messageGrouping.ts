import { MESSAGE_POSITION } from "@/lib/constants";
import type { MessagePosition } from "@/lib/types/message";

interface MessageWithSender {
    sender_id: string | null;
    is_deleted?: boolean;
}

/**
 * Определяет позицию сообщения в группе (single, start, middle, end)
 * на основе отправителя предыдущего и следующего сообщения.
 *
 * @param currentMsg - Текущее сообщение
 * @param prevMsg - Предыдущее сообщение (по времени, т.е. выше)
 * @param nextMsg - Следующее сообщение (по времени, т.е. ниже)
 */
export function getMessageGroupPosition(
    currentMsg: MessageWithSender,
    prevMsg?: MessageWithSender,
    nextMsg?: MessageWithSender,
): MessagePosition {
    // Удаленное сообщение всегда SINGLE и разрывает группу для соседей
    if (currentMsg.is_deleted) {
        return MESSAGE_POSITION.SINGLE;
    }

    // Проверка: сообщение от того же отправителя, что и предыдущее?
    // И оно НЕ удалено
    const isTop =
        prevMsg &&
        !prevMsg.is_deleted &&
        prevMsg.sender_id === currentMsg.sender_id;

    // Проверка: сообщение от того же отправителя, что и следующее?
    // И оно НЕ удалено
    const isBottom =
        nextMsg &&
        !nextMsg.is_deleted &&
        nextMsg.sender_id === currentMsg.sender_id;

    if (isTop && isBottom) {
        return MESSAGE_POSITION.MIDDLE;
    }
    if (isTop && !isBottom) {
        return MESSAGE_POSITION.END;
    }
    if (!isTop && isBottom) {
        return MESSAGE_POSITION.START;
    }

    return MESSAGE_POSITION.SINGLE;
}
