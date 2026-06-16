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
    const [prevRoomId, setPrevRoomId] = useState(roomId);

    // Состояния для статической плашки непрочитанных сообщений
    const [unreadDividerId, setUnreadDividerId] = useState<string | null>(null);
    const [hasFixedDivider, setHasFixedDivider] = useState(false);
    const [isDividerDismissed, setIsDividerDismissed] = useState(false);

    // Сброс стейта при смене комнаты
    if (prevRoomId !== roomId) {
        setPrevRoomId(roomId);
        setUnreadDividerId(null);
        setHasFixedDivider(false);
        setIsDividerDismissed(false);
    }

    // Фиксируем unreadDividerId один раз при входе в чат (когда загрузился lastReadAt и сообщения)
    if (
        !hasFixedDivider &&
        !isDividerDismissed &&
        lastReadAt &&
        messages.length > 0 &&
        pbUser
    ) {
        const lastReadTime = new Date(lastReadAt).getTime();
        const firstUnread = messages.find(
            (m) =>
                new Date(m.created).getTime() > lastReadTime &&
                m.sender !== pbUser.id,
        );
        if (firstUnread) {
            setUnreadDividerId(firstUnread.id);
        }
        setHasFixedDivider(true);
    }

    // Декларативно вычисляем ID текущего первого непрочитанного сообщения (для кнопки скролла)
    const firstUnreadId = useMemo(() => {
        if (!lastReadAt || messages.length === 0 || !pbUser) {
            return null;
        }

        const lastReadTime = new Date(lastReadAt).getTime();
        const firstUnread = messages.find(
            (m) =>
                new Date(m.created).getTime() > lastReadTime &&
                m.sender !== pbUser.id,
        );

        return firstUnread?.id || null;
    }, [messages, lastReadAt, pbUser]);

    const dismissDivider = useCallback(() => {
        setIsDividerDismissed(true);
        setUnreadDividerId(null);
    }, []);

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
        unreadDividerId,
        dismissDivider,
        markMessageAsRead,
    };
}
