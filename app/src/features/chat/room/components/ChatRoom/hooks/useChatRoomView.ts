import { useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useMessages, useUnreadTracking } from "@/features/chat/message";
import { useChatRoomData } from "@/features/chat/room/hooks/useChatRoomData";
import { ROOM_TYPE, ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";

/**
 * Хук view-логики комнаты чата.
 *
 * Инкапсулирует:
 * - Загрузку и фильтрацию сообщений (starred-фильтр для Избранного)
 * - Определение режима отображения (isFavoritesView)
 * - Ref для скролла к последнему сообщению / к непрочитанному
 * - Отслеживание первого непрочитанного (firstUnreadId)
 *
 * Заменяет соответствующую логику из упразднённого god hook `useChatRoom`.
 *
 * @param roomId - ID комнаты чата
 */
export function useChatRoomView(roomId: string) {
    const user = useAuthStore((state) => state.profile);
    const { pathname } = useLocation();

    // --- Данные комнаты (для определения типа и участников) ---
    const { data: roomInfo } = useChatRoomData(roomId);
    const room = roomInfo?.room;
    const roomKey = roomInfo?.roomKey;

    // --- Сырые сообщения из кэша ---
    const { data: messages = [], isLoading: messagesLoading } = useMessages(
        roomId,
        roomKey,
    );

    // --- Отслеживание непрочитанных ---
    const lastReadAt = useMemo(() => {
        return room?.room_members?.find((m) => m.user_id === user?.id)
            ?.last_read_at;
    }, [room?.room_members, user?.id]);

    const { firstUnreadId, markAsRead } = useUnreadTracking(
        roomId,
        messages,
        lastReadAt,
    );

    // Помечаем сообщения прочитанными при входе и выходе из комнаты
    // Используем ref, чтобы избежать срабатывания эффекта при каждом изменении функции markAsRead
    const markAsReadRef = useRef(markAsRead);
    markAsReadRef.current = markAsRead;

    useEffect(() => {
        // При входе помечаем прочитанным
        markAsReadRef.current();

        return () => {
            // При выходе тоже (на случай если были новые сообщения пока чат был открыт)
            markAsReadRef.current();
        };
    }, []);

    // --- Ref для управления скроллом (передаётся в MessageList) ---
    const scrollRef = useRef<{ scrollToBottom: () => void } | null>(null);

    // --- Определяем: открыт ли вид «Избранного» ---
    const isFavoritesView = pathname.startsWith(ROUTES.FAVORITES);

    /**
     * Проверка: чат с самим собой (Избранное — self-chat).
     * В self-chat показываем ВСЕ сообщения, а не только starred.
     */
    const isSelfChat =
        room?.type === ROOM_TYPE.DIRECT &&
        room.room_members?.length === 1 &&
        room.room_members[0].user_id === user?.id;

    /**
     * В «Избранном» (кроме self-chat) фильтруем только сообщения со звёздочкой.
     * В обычном режиме — показываем все.
     */
    /**
     * Фильтрация сообщений:
     * 1. Исключаем сообщения, удаленные отправителем (мягкое удаление для всех, но отправитель их не видит).
     * 2. Исключаем сообщения, которые пользователь скрыл лично для себя (deleted_by).
     * 3. В режиме «Избранного» оставляем только сообщения со звездочкой.
     */
    const filteredMessages = useMemo(() => {
        const result = messages.filter((m) => {
            // Если я сам удалил свое сообщение — оно исчезает для меня
            if (m.is_deleted && m.sender_id === user?.id) {
                return false;
            }
            // Если я скрыл сообщение (любое) только для себя
            if (m.metadata?.deleted_by?.includes(user?.id || "")) {
                return false;
            }
            return true;
        });

        if (isFavoritesView && !isSelfChat) {
            return result.filter((m) => m.is_starred);
        }
        return result;
    }, [messages, isFavoritesView, isSelfChat, user?.id]);

    return {
        messages: filteredMessages,
        messagesLoading,
        firstUnreadId,
        isFavoritesView,
        scrollRef,
    };
}
