import { useCallback, useMemo, useRef, useState } from "react";
import { MEMBER_ROLE, ROOM_MEMBER_FIELDS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { roomRepository } from "@/lib/repositories/room.repository";
import type { DecryptedMessageWithProfile } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";

/**
 * Хук для отслеживания непрочитанных сообщений в конкретной комнате.
 * Управляет разделителем "Новые сообщения" и обновляет время последнего прочтения.
 */
export function useUnreadTracking(
    roomId: string,
    messages: DecryptedMessageWithProfile[],
    lastReadAt?: string | null,
) {
    const pbUser = useAuthStore((state) => state.pbUser);
    const [isManuallyRead, setIsManuallyRead] = useState(false);
    const [prevRoomId, setPrevRoomId] = useState(roomId);

    // Сброс стейта при смене комнаты
    if (prevRoomId !== roomId) {
        setPrevRoomId(roomId);
        setIsManuallyRead(false);
    }

    // Декларативно вычисляем ID первого непрочитанного сообщения
    const firstUnreadId = useMemo(() => {
        if (isManuallyRead || !lastReadAt || messages.length === 0) {
            return null;
        }

        const lastReadTime = new Date(lastReadAt).getTime();
        const firstUnread = messages.find(
            (m) => new Date(m.created_at).getTime() > lastReadTime,
        );

        return firstUnread?.id || null;
    }, [messages, lastReadAt, isManuallyRead]);

    const messagesRef = useRef(messages);
    const lastReadAtRef = useRef(lastReadAt);
    messagesRef.current = messages;
    lastReadAtRef.current = lastReadAt;

    const markAsRead = useCallback(async () => {
        const currentMessages = messagesRef.current;
        const currentLastReadAt = lastReadAtRef.current;

        if (!roomId || !pbUser || currentMessages.length === 0) {
            return;
        }

        // 1. Быстрая проверка: если последнее сообщение уже старее времени прочтения — выходим без запроса к API
        const lastMessage = currentMessages[currentMessages.length - 1];
        if (currentLastReadAt && lastMessage) {
            const dbTime = new Date(currentLastReadAt).getTime();
            const msgTime = new Date(lastMessage.created_at).getTime();
            if (dbTime >= msgTime) {
                return;
            }
        }

        // 2. Получаем актуального участника для проверки unread_count
        const memberResult = await roomRepository.getMemberByRoomAndUser(
            roomId,
            pbUser.id,
        );

        if (memberResult.isErr()) {
            return;
        }

        const member = memberResult.value;

        // 3. Если в базе уже всё прочитано (или unread_count === 0) — обновлять не нужно
        if (member.unread_count === 0) {
            return;
        }

        // 4. Обновляем время прочтения
        const updateResult = await roomRepository.updateMember(member.id, {
            [ROOM_MEMBER_FIELDS.LAST_READ_AT]: new Date().toISOString(),
            [ROOM_MEMBER_FIELDS.UNREAD_COUNT]: 0,
            [ROOM_MEMBER_FIELDS.ROLE]: member.role || MEMBER_ROLE.MEMBER, // Обязательное поле
        });

        if (updateResult.isOk()) {
            setIsManuallyRead(true);
            logger.info(`Комната ${roomId} помечена как прочитанная`);
        }
    }, [roomId, pbUser]);

    return {
        firstUnreadId,
        markAsRead,
    };
}
