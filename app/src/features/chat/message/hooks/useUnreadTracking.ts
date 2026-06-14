import { useCallback, useMemo, useRef, useState } from "react";
import { MEMBER_ROLE, ROOM_MEMBER_FIELDS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { roomRepository } from "@/lib/repositories/room.repository";
import { MessageService } from "@/lib/services/message";
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
            (m) => new Date(m.created).getTime() > lastReadTime,
        );

        return firstUnread?.id || null;
    }, [messages, lastReadAt, isManuallyRead]);

    const messagesRef = useRef(messages);
    const lastReadAtRef = useRef(lastReadAt);
    messagesRef.current = messages;
    lastReadAtRef.current = lastReadAt;

    const markMessageAsRead = useCallback(
        async (message: DecryptedMessageWithProfile) => {
            const currentMessages = messagesRef.current;
            const currentLastReadAt = lastReadAtRef.current;

            if (!roomId || !pbUser || currentMessages.length === 0) {
                return;
            }

            const messageTime = new Date(message.created).getTime();

            // Если это сообщение уже прочитано, ничего не делаем
            if (
                currentLastReadAt &&
                new Date(currentLastReadAt).getTime() >= messageTime
            ) {
                return;
            }

            // Получаем актуального участника для проверки
            const memberResult = await roomRepository.getMemberByRoomAndUser(
                roomId,
                pbUser.id,
            );

            if (memberResult.isErr()) {
                return;
            }

            const member = memberResult.value;

            // Проверяем еще раз по актуальным данным БД
            const dbLastReadTime = member.last_read_at
                ? new Date(member.last_read_at).getTime()
                : 0;
            if (messageTime <= dbLastReadTime) {
                return;
            }

            // Вычисляем новый unread_count: количество сообщений от собеседника, созданных после message.created
            const newUnreadCount = currentMessages.filter(
                (m) =>
                    m.sender !== pbUser.id &&
                    new Date(m.created).getTime() > messageTime,
            ).length;

            // Обновляем время прочтения и количество непрочитанных
            const updateResult = await roomRepository.updateMember(member.id, {
                [ROOM_MEMBER_FIELDS.LAST_READ_AT]: message.created,
                [ROOM_MEMBER_FIELDS.UNREAD_COUNT]: newUnreadCount,
                [ROOM_MEMBER_FIELDS.ROLE]: member.role || MEMBER_ROLE.MEMBER,
            });

            if (updateResult.isOk()) {
                setIsManuallyRead(true);
                logger.info(
                    `Сообщение ${message.id} от ${message.sender} помечено как прочитанное, новый unread_count: ${newUnreadCount}`,
                );
                MessageService.markMessagesAsRead(roomId, pbUser.id).catch(
                    (err) => {
                        logger.error(
                            "Ошибка при пометке сообщений как прочитанных в БД",
                            err,
                        );
                    },
                );
            }
        },
        [roomId, pbUser],
    );

    return {
        firstUnreadId,
        markMessageAsRead,
    };
}
