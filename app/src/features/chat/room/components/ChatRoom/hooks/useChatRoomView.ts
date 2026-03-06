import { useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useMessages, useUnreadTracking } from "@/features/chat/message";
import { useChatRoomData } from "@/features/chat/room/hooks/useChatRoomData";
import { ROUTES } from "@/lib/constants";
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
    const { user } = useAuthStore();
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
    const { firstUnreadId, markAsRead } = useUnreadTracking(roomId, messages);

    // Помечаем сообщения прочитанными при unmount (выходе из комнаты)
    useEffect(() => {
        return () => {
            markAsRead();
        };
    }, [markAsRead]);

    // --- Ref для управления скроллом (передаётся в MessageList) ---
    const scrollRef = useRef<{ scrollToBottom: () => void } | null>(null);

    // --- Определяем: открыт ли вид «Избранного» ---
    const isFavoritesView = pathname.startsWith(ROUTES.FAVORITES);

    /**
     * Проверка: чат с самим собой (Избранное — self-chat).
     * В self-chat показываем ВСЕ сообщения, а не только starred.
     */
    const isSelfChat =
        room?.type === "direct" &&
        room.room_members?.length === 1 &&
        room.room_members[0].user_id === user?.id;

    /**
     * В «Избранном» (кроме self-chat) фильтруем только сообщения со звёздочкой.
     * В обычном режиме — показываем все.
     */
    const filteredMessages = useMemo(() => {
        if (isFavoritesView && !isSelfChat) {
            return messages.filter((m) => m.is_starred);
        }
        return messages;
    }, [messages, isFavoritesView, isSelfChat]);

    return {
        messages: filteredMessages,
        messagesLoading,
        firstUnreadId,
        isFavoritesView,
        scrollRef,
    };
}
