import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { QUERY_KEYS } from "@/lib/constants";
import { getUserRooms } from "@/lib/services/room";
import type { RoomWithMembers } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";
import type { ChatItem } from "../ChatList/ChatListItem/index";
import { mapRoomToChatItem } from "../utils/roomUiMapper";

/**
 * Хук для получения списка чатов текущего пользователя.
 */
export function useChatList() {
    const { t } = useTranslation();
    const { pbUser } = useAuthStore();

    return useQuery({
        queryKey: QUERY_KEYS.rooms(pbUser?.id),
        queryFn: async (): Promise<RoomWithMembers[]> => {
            if (!pbUser) {
                return [];
            }

            const result = await getUserRooms(pbUser.id);

            if (result.isErr()) {
                throw result.error;
            }

            return result.value;
        },
        select: (data: RoomWithMembers[]): ChatItem[] => {
            if (!data) {
                return [];
            }

            if (!pbUser) {
                return [];
            }

            // 1. Просто маппим каждую комнату (фильтрация по expand.room больше не нужна!)
            const processedChats = data.map((room) => {
                const mapped = mapRoomToChatItem(room, pbUser.id);
                // Применяем локализацию
                let displayName = t(mapped.name);
                if (mapped.isEphemeral) {
                    displayName = `🔒 ${displayName}`;
                }

                return {
                    ...mapped,
                    name: displayName,
                    lastMessage: mapped.lastMessage || t("chat.noMessages"),
                    time: mapped.time ? t(mapped.time) : "",
                };
            });

            // 2. Сортируем список по дате последнего сообщения (сначала новые)
            // localeCompare отлично работает для строк формата ISO
            return processedChats.sort((a, b) => {
                return b._rawDate.localeCompare(a._rawDate);
            });
        },

        enabled: !!pbUser,
        staleTime: 1000 * 30, // 30 секунд
    });
}
