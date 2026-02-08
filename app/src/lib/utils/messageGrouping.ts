import { MESSAGE_POSITION } from '@/lib/constants';
import type { MessagePosition } from '@/lib/types/message';

interface MessageWithSender {
    sender_id: string | null;
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
    // Проверка: сообщение от того же отправителя, что и предыдущее?
    const isTop = prevMsg && prevMsg.sender_id === currentMsg.sender_id;

    // Проверка: сообщение от того же отправителя, что и следующее?
    const isBottom = nextMsg && nextMsg.sender_id === currentMsg.sender_id;

    if (isTop && isBottom) return MESSAGE_POSITION.MIDDLE;
    if (isTop && !isBottom) return MESSAGE_POSITION.END;
    if (!isTop && isBottom) return MESSAGE_POSITION.START;

    return MESSAGE_POSITION.SINGLE;
}
