import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { QUERY_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { chatCryptoService } from "@/lib/services/chat-crypto";
import { getUserRooms } from "@/lib/services/room";
import type {
    ExtendedChatItem,
    MessageRow,
    RoomWithMembers,
} from "@/lib/types";
import { useAuthStore } from "@/stores/auth";
import { mapRoomToChatItem } from "../utils/roomUiMapper";

/**
 * Хук для получения и обработки списка чатов текущего пользователя.
 *
 * Выполняет следующие задачи:
 * 1. Получает сырые данные комнат из PocketBase.
 * 2. Маппит их в формат ChatItem для UI.
 * 3. Локализует названия и системные сообщения.
 * 4. Сортирует список согласно правилам:
 *    - "Избранное" (Saved Messages) всегда на первом месте.
 *    - Закрепленные чаты следуют далее, сортируясь по времени закрепления (pinPosition).
 *    - Все остальные чаты сортируются по дате последнего обновления/сообщения.
 *
 * @returns {UseQueryResult<ChatItem[]>} Объект с данными чатов, статусом загрузки и ошибками.
 */
export function useChatList() {
    const { t } = useTranslation();
    const pbUser = useAuthStore((state) => state.pbUser);

    return useQuery({
        queryKey: QUERY_KEYS.rooms(pbUser?.id),
        queryFn: async (): Promise<RoomWithMembers[]> => {
            if (!pbUser) {
                return [];
            }

            const result = await getUserRooms(pbUser.id);

            if (result.isErr()) {
                logger.error("Failed to fetch rooms", result.error);
                throw result.error;
            }

            const rooms = result.value;

            // Параллельно расшифровываем контент последних сообщений для превью
            await Promise.all(
                rooms.map(async (room) => {
                    if (
                        room.last_message &&
                        !room.last_message.is_deleted &&
                        room.last_message.content
                    ) {
                        const { content } =
                            await chatCryptoService.decryptPreview({
                                message: {
                                    ...room.last_message,
                                    room: room.id,
                                } as unknown as MessageRow,
                                userId: pbUser.id,
                            });
                        room.last_message.content = content;
                    }
                }),
            );

            return rooms;
        },
        select: (data: RoomWithMembers[]): ExtendedChatItem[] => {
            if (!data || !pbUser) {
                return [];
            }

            // 1. Маппим комнаты в формат элементов списка чатов (ExtendedChatItem)
            const processedChats = data.map((room) => {
                const mapped = mapRoomToChatItem(room, pbUser.id);

                // Применяем локализацию и спец. оформление
                let displayName = t(mapped.name);
                if (mapped.isEphemeral) {
                    displayName = `🔒 ${displayName}`;
                }

                return {
                    ...mapped,
                    name: displayName,
                    lastMessage:
                        mapped.lastMessage === "chat.noMessages" ||
                        mapped.lastMessage === "chat.messageDeleted" ||
                        mapped.lastMessage?.startsWith("chat.attachment.")
                            ? t(mapped.lastMessage)
                            : mapped.lastMessage,
                    time:
                        mapped.time === "common.yesterday"
                            ? t(mapped.time)
                            : mapped.time || "",
                };
            });

            // 2. Выполняем многоуровневую сортировку
            return [...processedChats].sort((a, b) => {
                // Приоритет 1: "Saved Messages" (Избранное) всегда на вершине
                if (a.isSavedMessages !== b.isSavedMessages) {
                    return a.isSavedMessages ? -1 : 1;
                }

                // Приоритет 2: Закрепленные чаты
                const aPinned = Number(a.pinPosition || 0) > 0;
                const bPinned = Number(b.pinPosition || 0) > 0;

                if (aPinned !== bPinned) {
                    return aPinned ? -1 : 1;
                }

                // Если оба закреплены, сортируем по времени закрепления (desc)
                if (aPinned && bPinned) {
                    const pinDiff =
                        Number(b.pinPosition || 0) - Number(a.pinPosition || 0);
                    if (pinDiff !== 0) {
                        return pinDiff;
                    }
                }

                // Приоритет 3: По дате последнего сообщения (сначала свежие)
                return b._lastMsgTimestamp - a._lastMsgTimestamp;
            });
        },
        enabled: !!pbUser,
        staleTime: 1000 * 30, // 30 секунд
    });
}
