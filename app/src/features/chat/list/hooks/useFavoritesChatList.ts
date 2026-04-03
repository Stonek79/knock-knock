import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { QUERY_KEYS } from "@/lib/constants";
import { getFavoriteRooms } from "@/lib/services/room";
import type { RoomWithMembers } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";
import type { ChatItem } from "../ChatList/ChatListItem";
import { mapRoomToChatItem } from "../utils/roomUiMapper";

/**
 * Хук для получения списка "Избранных" чатов.
 * Включает:
 * 1. Чат с самим собой (Saved Messages).
 * 2. Все чаты, содержащие хотя бы одно избранное сообщение.
 */
export function useFavoritesChatList() {
    const { t } = useTranslation();
    const pbUser = useAuthStore((state) => state.pbUser);

    return useQuery({
        queryKey: QUERY_KEYS.favorites(pbUser?.id),
        queryFn: async (): Promise<RoomWithMembers[]> => {
            if (!pbUser) {
                return [];
            }

            const result = await getFavoriteRooms(pbUser.id);

            if (result.isErr()) {
                throw result.error;
            }

            return result.value;
        },
        select: (data: RoomWithMembers[]): ChatItem[] => {
            if (!pbUser) {
                return [];
            }

            // 1. Маппим данные и применяем логику отображения (переводы + иконки)
            const processedChats = data.map((room) => {
                const mapped = mapRoomToChatItem(room, pbUser.id);

                // Определяем базовое имя (с переводом если это "Избранное")
                let displayName = mapped.isSavedMessages
                    ? t("chat.favorites")
                    : mapped.name;
                // Добавляем замок для эфемерных комнат
                if (mapped.isEphemeral) {
                    displayName = `🔒 ${displayName}`;
                }
                return {
                    ...mapped,
                    name: displayName,
                    // Переводим заглушку если сообщений нет
                    lastMessage: mapped.lastMessage || t("chat.noMessages"),
                    time: mapped.time ? t(mapped.time) : "",
                };
            });

            // 2. Убираем дубликаты (оставляем только одно "Избранное")
            const uniqueChatsMap = new Map<
                string,
                (typeof processedChats)[0]
            >();
            let selfChatFound = false;
            for (const chat of processedChats) {
                if (chat.isSavedMessages) {
                    if (selfChatFound) {
                        continue;
                    }
                    selfChatFound = true;
                }
                if (!uniqueChatsMap.has(chat.id)) {
                    uniqueChatsMap.set(chat.id, chat);
                }
            }

            // 3. Сортируем: сначала "Избранное", затем по дате последнего сообщения
            return (
                Array.from(uniqueChatsMap.values())
                    .sort((a, b) => {
                        if (a.isSavedMessages && !b.isSavedMessages) {
                            return -1;
                        }
                        if (!a.isSavedMessages && b.isSavedMessages) {
                            return 1;
                        }
                        return (
                            new Date(b._rawDate).getTime() -
                            new Date(a._rawDate).getTime()
                        );
                    })
                    // 4. Очищаем объект от сервисных полей для UI
                    .map(
                        ({
                            _rawDate,
                            isSavedMessages,
                            isSelf,
                            isEphemeral,
                            ...item
                        }) => item as ChatItem,
                    )
            );
        },
        enabled: !!pbUser,
    });
}
