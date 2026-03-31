import { ROOM_TYPE } from "@/lib/constants";
import type { RoomWithMembers } from "@/lib/types";
import { DEFAULT_DATE, ensureISODate, formatChatTime } from "@/lib/utils/date";
import type { ChatItem } from "../ChatList/ChatListItem/index";

/**
 * Преобразует доменную модель комнаты (RoomWithMembers) в объект для UI (ChatItem).
 * Используется для отображения списка чатов.
 */
export function mapRoomToChatItem(
    room: RoomWithMembers,
    currentUserId: string,
): ChatItem & {
    isSelf: boolean;
    isSavedMessages: boolean;
    isEphemeral: boolean;
    _rawDate: string;
} {
    const members = room.room_members || [];

    // Определяем, "Избранное" это или обычный чат
    const isSavedMessages =
        room.type === ROOM_TYPE.DIRECT && members.length === 1;
    // Ищем собеседника в массиве members
    const peerMember = members.find((m) => m.user_id !== currentUserId);
    // Ищем текущего пользователя для unread_count
    const me = members.find((m) => m.user_id === currentUserId);
    const peer = peerMember?.profiles || null;

    // Берем последнее сообщение
    const lastMsg = room.last_message;
    const lastMsgDate = lastMsg?.created_at
        ? ensureISODate(lastMsg.created_at)
        : null;

    // Имя комнаты: для DIRECT — имя собеседника, для GROUP — название комнаты
    const roomName =
        room.type === ROOM_TYPE.DIRECT
            ? isSavedMessages
                ? "favorites.title"
                : peer?.display_name || room.name || "chat.unknownRoom"
            : room.name || "chat.unknownRoom";

    return {
        id: room.id,
        name: roomName,
        avatar: isSavedMessages ? undefined : peer?.avatar_url || undefined,
        lastMessage: lastMsg?.content || undefined,
        time: lastMsgDate ? formatChatTime(lastMsgDate) : "",
        unread: me?.unread_count || 0,
        isSelf: isSavedMessages,
        isSavedMessages,
        isEphemeral: room.type === ROOM_TYPE.EPHEMERAL,
        _rawDate: lastMsgDate || DEFAULT_DATE,
    };
}
