import type { QueryData } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DB_TABLES, QUERY_KEYS, ROOM_TYPE } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatChatTime } from "@/lib/utils/date";
import { useAuthStore } from "@/stores/auth";
import type { ChatItem } from "../ChatList/ChatListItem";

const getRoomsQuery = (userId: string) =>
    supabase
        .from(DB_TABLES.ROOM_MEMBERS)
        .select(`
            room_id,
            rooms (
                id,
                name,
                type,
                is_ephemeral,
                last_message: messages!last_message_id (
                    content,
                    created_at,
                    sender_id
                ),
                room_members (
                    user_id,
                    profiles (
                        display_name,
                        avatar_url
                    )
                )
            )
        `)
        .eq("user_id", userId);

type RoomQueryResult = QueryData<ReturnType<typeof getRoomsQuery>>;

/**
 * Хук для получения списка чатов текущего пользователя.
 */
export function useChatList() {
    const { t } = useTranslation();
    const { user } = useAuthStore();

    return useQuery({
        queryKey: QUERY_KEYS.rooms(user?.id),
        queryFn: async (): Promise<RoomQueryResult> => {
            if (!user) {
                const empty: RoomQueryResult = [];
                return empty;
            }

            const { data, error } = await getRoomsQuery(user.id);

            if (error) {
                console.error("Failed to fetch rooms", error);
                throw error;
            }

            const result: RoomQueryResult = data || [];
            return result;
        },
        select: (data: RoomQueryResult) => {
            return data
                .filter((item) => item.rooms) // Filter out orphaned members
                .filter((item) => {
                    // Исключаем чаты с самим собой ("Избранное") из общего списка
                    const room = Array.isArray(item.rooms)
                        ? item.rooms[0]
                        : item.rooms;
                    if (!room) {
                        return false;
                    }

                    if (room.type === ROOM_TYPE.DIRECT) {
                        const otherMembers = room.room_members.filter(
                            (m: { user_id: string }) => m.user_id !== user?.id,
                        );
                        return otherMembers.length > 0;
                    }
                    return true;
                })
                .map((item) => {
                    const room = Array.isArray(item.rooms)
                        ? item.rooms[0]
                        : item.rooms;
                    const isDM = room?.type === ROOM_TYPE.DIRECT;

                    // Для DM чатов пытаемся найти имя собеседника
                    let displayName = room?.name;
                    let avatarUrl: string | undefined;

                    if (isDM && user) {
                        const peer = room?.room_members.find(
                            (m: { user_id: string }) => m.user_id !== user.id,
                        );
                        const profile = Array.isArray(peer?.profiles)
                            ? peer?.profiles[0]
                            : peer?.profiles;
                        if (profile) {
                            displayName = profile.display_name;
                            avatarUrl = profile.avatar_url || undefined;
                        }
                    }

                    if (!displayName) {
                        displayName = isDM
                            ? t("chat.directChat", "Личный чат")
                            : t("chat.groupChat", "Группа");
                    }

                    // Добавляем иконку замка для секретных чатов
                    const nameWithStatus = room?.is_ephemeral
                        ? `🔒 ${displayName}`
                        : displayName;

                    const lastMsg = Array.isArray(room?.last_message)
                        ? room?.last_message[0]
                        : room?.last_message;

                    return {
                        id: room?.id || "",
                        name: nameWithStatus,
                        avatar: avatarUrl,
                        lastMessage:
                            lastMsg?.content ||
                            t("chat.noMessages", "Нет сообщений"),
                        time: lastMsg?.created_at
                            ? formatChatTime(lastMsg.created_at, t)
                            : "",
                        // Добавляем сырую дату для сортировки
                        _rawDate: lastMsg?.created_at || "1970-01-01T00:00:00Z",
                    } as ChatItem & { _rawDate: string };
                })
                .sort((a, b) => {
                    return (
                        new Date(b._rawDate).getTime() -
                        new Date(a._rawDate).getTime()
                    );
                })
                .map(({ _rawDate, ...item }) => item);
        },
        enabled: !!user,
        staleTime: 1000 * 30, // 30 секунд
    });
}
