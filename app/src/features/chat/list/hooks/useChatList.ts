import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DB_TABLES, ROOM_TYPE } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { RoomType } from "@/lib/types/room";
import { formatChatTime } from "@/lib/utils/date";
import { useAuthStore } from "@/stores/auth";
import type { ChatItem } from "../ChatList/ChatListItem";

/**
 * Тип результата запроса комнат из БД.
 */
interface RoomQueryResult {
    room_id: string;
    rooms: {
        id: string;
        name: string | null;
        type: RoomType;
        is_ephemeral: boolean;
        last_message?: {
            content: string;
            created_at: string;
            sender_id: string;
        };
        room_members: {
            user_id: string;
            profiles: {
                display_name: string;
                avatar_url: string | null;
            } | null;
        }[];
    };
}

/**
 * Хук для получения списка чатов текущего пользователя.
 */
export function useChatList() {
    const { t } = useTranslation();
    const { user } = useAuthStore();

    return useQuery({
        queryKey: ["rooms", user?.id],
        queryFn: async (): Promise<RoomQueryResult[]> => {
            if (!user) {
                return [];
            }

            // TODO: правильно ли офрмлена работа с базой, может можно есть другой подход?
            const { data, error } = await supabase
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
                .eq("user_id", user.id);

            if (error) {
                console.error("Failed to fetch rooms", error);
                throw error;
            }

            return data as unknown as RoomQueryResult[];
        },
        select: (data: RoomQueryResult[]): ChatItem[] => {
            return data
                .filter((item) => item.rooms) // Filter out orphaned members
                .filter((item) => {
                    // Исключаем чаты с самим собой ("Избранное") из общего списка
                    if (item.rooms.type === ROOM_TYPE.DIRECT) {
                        const otherMembers = item.rooms.room_members.filter(
                            (m) => m.user_id !== user?.id,
                        );
                        return otherMembers.length > 0;
                    }
                    return true;
                })
                .map((item) => {
                    const room = item.rooms;
                    const isDM = room.type === ROOM_TYPE.DIRECT;

                    // Для DM чатов пытаемся найти имя собеседника
                    let displayName = room.name;
                    let avatarUrl: string | undefined;

                    if (isDM && user) {
                        const peer = room.room_members.find(
                            (m) => m.user_id !== user.id,
                        );
                        if (peer?.profiles) {
                            displayName = peer.profiles.display_name;
                            avatarUrl = peer.profiles.avatar_url || undefined;
                        }
                    }

                    if (!displayName) {
                        displayName = isDM
                            ? t("chat.directChat", "Личный чат")
                            : t("chat.groupChat", "Группа");
                    }

                    // Добавляем иконку замка для секретных чатов
                    const nameWithStatus = room.is_ephemeral
                        ? `🔒 ${displayName}`
                        : displayName;

                    return {
                        id: room.id,
                        name: nameWithStatus,
                        avatar: avatarUrl,
                        lastMessage:
                            room.last_message?.content ||
                            t("chat.noMessages", "Нет сообщений"),
                        time: room.last_message?.created_at
                            ? formatChatTime(room.last_message.created_at, t)
                            : "",
                        // Добавляем сырую дату для сортировки
                        _rawDate:
                            room.last_message?.created_at ||
                            "1970-01-01T00:00:00Z",
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
