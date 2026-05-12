import { ROOM_TYPE } from "@/lib/constants";
import type { ExtendedChatItem, RoomWithMembers } from "@/lib/types";
import { DEFAULT_DATE, ensureISODate, formatChatTime } from "@/lib/utils/date";

/**
 * Преобразует доменную модель комнаты (RoomWithMembers) в объект для UI (ExtendedChatItem).
 *
 * Логика преобразования:
 * 1. Определяет тип чата (личный, избранное, групповой, эфемерный).
 * 2. Вычисляет актуальный таймстамп для сортировки (максимум из даты комнаты и сообщения).
 * 3. Формирует текст последнего сообщения (учитывая удаления и вложения).
 * 4. Подготавливает имя и аватар согласно типу чата и участникам.
 *
 * @param room - Сырые данные комнаты из базы.
 * @param currentUserId - ID текущего авторизованного пользователя.
 * @returns Объект, готовый для отображения в списке чатов.
 */
export function mapRoomToChatItem(
    room: RoomWithMembers,
    currentUserId: string,
): ExtendedChatItem {
    const members = room.room_members || [];

    // 1. Определяем контекст чата
    const isSavedMessages =
        room.type === ROOM_TYPE.DIRECT && members.length === 1;
    const peerMember = members.find((m) => m.user_id !== currentUserId);
    const me = members.find((m) => m.user_id === currentUserId);
    const peer = peerMember?.profiles || null;

    // 2. Обработка последнего сообщения (типизировано через lastMessagePreviewSchema)
    const lastMsg = room.last_message;
    const lastMsgDate = lastMsg?.created
        ? ensureISODate(lastMsg.created)
        : null;

    let lastMessageText = "chat.noMessages";
    if (lastMsg) {
        if (lastMsg.is_deleted) {
            lastMessageText = "chat.messageDeleted";
        } else if (lastMsg.content) {
            lastMessageText = lastMsg.content;
        } else if (lastMsg.attachments && lastMsg.attachments.length > 0) {
            lastMessageText = `chat.attachment.${lastMsg.attachments[0].type}`;
        }
    }

    // 3. Расчет таймстампа для сортировки
    const getTs = (dateStr?: string | null) => {
        if (!dateStr) {
            return 0;
        }
        const ts = new Date(ensureISODate(dateStr)).getTime();
        return Number.isNaN(ts) ? 0 : ts;
    };

    const msgTime = getTs(lastMsg?.created);
    const roomTime = getTs(room.updated);

    // Если оба времени недоступны, используем дефолтную дату (самый низ списка)
    const lastMsgTimestamp =
        msgTime || roomTime
            ? Math.max(msgTime, roomTime)
            : new Date(DEFAULT_DATE).getTime();

    // 4. Формирование имени и аватара
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
        lastMessage: lastMessageText,
        time: lastMsgDate ? formatChatTime(lastMsgDate) : "",
        unread: me?.unread_count || 0,
        pinPosition: me?.pin_position ?? null,
        isSelf: isSavedMessages,
        isSavedMessages,
        isEphemeral: room.type === ROOM_TYPE.EPHEMERAL,
        _lastMsgTimestamp: lastMsgTimestamp,
    };
}
