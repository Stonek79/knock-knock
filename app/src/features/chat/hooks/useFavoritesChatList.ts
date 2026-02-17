import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DB_TABLES, type ROOM_TYPE } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatChatTime } from "@/lib/utils/date";
import { useAuthStore } from "@/stores/auth";
import type { ChatItem } from "../ChatList/ChatListItem";

type RoomType = (typeof ROOM_TYPE)[keyof typeof ROOM_TYPE];

interface RoomQueryResult {
    room_id: string;
    rooms: {
        id: string;
        name: string | null;
        type: RoomType;
        is_ephemeral: boolean;
        last_message: {
            content: string;
            created_at: string;
            sender_id: string;
        } | null;
        room_members: {
            user_id: string;
            profiles: {
                display_name: string;
                avatar_url: string | null;
            } | null;
        }[];
        starred_messages?: { id: string }[];
    } | null;
}

/**
 * Хук для получения списка "Избранных" чатов.
 * Включает:
 * 1. Чат с самим собой (Saved Messages).
 * 2. Все чаты, содержащие хотя бы одно избранное сообщение.
 */
export function useFavoritesChatList() {
    const { t } = useTranslation();
    const { user } = useAuthStore();

    return useQuery({
        queryKey: ["rooms", "favorites", user?.id],
        queryFn: async (): Promise<RoomQueryResult[]> => {
            if (!user) {
                return [];
            }

            // 1. Получаем ID комнат, где есть избранные сообщения
            const { data: starredData, error: sErr } = await supabase
                .from(DB_TABLES.MESSAGES)
                .select("room_id")
                .eq("is_starred", true);

            if (sErr) {
                console.error("Error fetching starred messages:", sErr);
            }
            const starredRoomIds = new Set(
                starredData?.map((m) => m.room_id) || [],
            );

            // 2. Получаем все комнаты пользователя
            const { data: allRooms, error: allErr } = await supabase
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

            if (allErr) {
                console.error("Failed to fetch favorites", allErr);
                throw allErr;
            }

            // 3. Мапим результат, добавляя признак наличия избранных сообщений
            return (
                (allRooms?.map((item) => {
                    const room = item.rooms;
                    return {
                        ...item,
                        rooms: room
                            ? {
                                  ...room,
                                  starred_messages: starredRoomIds.has(
                                      item.room_id,
                                  )
                                      ? [{ id: "dummy" }]
                                      : [],
                              }
                            : null,
                    };
                }) as RoomQueryResult[]) || []
            );
        },
        select: (data: RoomQueryResult[]): ChatItem[] => {
            if (!user) {
                return [];
            }

            const processedChats = data
                .map((item) => {
                    const room = item.rooms;
                    if (!room) {
                        return null;
                    }

                    // 1. Чат с самим собой (Saved Messages)
                    // Проверяем: либо это Direct с 1 участником (собой), либо это Direct где current==target
                    const isSelf =
                        room.type === "direct" &&
                        room.room_members.some((m) => m.user_id === user.id) &&
                        (room.room_members.length === 1 ||
                            room.room_members.every(
                                (m) => m.user_id === user.id,
                            ));

                    // 2. Чаты с избранными сообщениями
                    const hasStarred = (room.starred_messages?.length || 0) > 0;

                    if (!isSelf && !hasStarred) {
                        return null;
                    }

                    let displayName = room.name;
                    let avatarUrl: string | undefined;

                    if (isSelf) {
                        displayName = t("chat.favorites", "Избранное");
                    } else if (room.type === "direct") {
                        const peer = room.room_members.find(
                            (m) => m.user_id !== user.id,
                        );
                        if (peer?.profiles) {
                            displayName = peer.profiles.display_name;
                            avatarUrl = peer.profiles.avatar_url || undefined;
                        }
                    }

                    return {
                        id: room.id,
                        name: room.is_ephemeral
                            ? `🔒 ${displayName}`
                            : displayName || "",
                        avatar: avatarUrl,
                        lastMessage:
                            room.last_message?.content || t("chat.noMessages"),
                        time: room.last_message?.created_at
                            ? formatChatTime(room.last_message.created_at, t)
                            : "",
                        isSelf, // Добавляем флаг для сортировки/дедупликации
                    } as ChatItem & { isSelf: boolean };
                })
                .filter(
                    (item): item is ChatItem & { isSelf: boolean } =>
                        item !== null,
                );

            // Дедупликация:
            // 1. Убираем полные дубликаты по ID
            // 2. Если есть несколько Self-Chats, оставляем только один (самый свежий или детерминированный)
            const uniqueChats = new Map<
                string,
                ChatItem & { isSelf: boolean }
            >();
            let selfChatFound = false;

            for (const chat of processedChats) {
                // Если это Self-Chat и мы уже нашли один — пропускаем (берем первый попавшийся, так как они сортируются сервером)
                if (chat.isSelf) {
                    if (selfChatFound) {
                        continue;
                    }

                    selfChatFound = true;
                }

                if (!uniqueChats.has(chat.id)) {
                    uniqueChats.set(chat.id, chat);
                }
            }

            return Array.from(uniqueChats.values());
        },
        enabled: !!user,
    });
}
