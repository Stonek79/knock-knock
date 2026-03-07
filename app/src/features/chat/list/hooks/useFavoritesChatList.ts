import type { QueryData } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DB_TABLES, QUERY_KEYS, ROOM_TYPE } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatChatTime } from "@/lib/utils/date";
import { useAuthStore } from "@/stores/auth";
import type { ChatItem } from "../ChatList/ChatListItem";

const getFavoritesQuery = (userId: string) =>
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

type BaseRoom = NonNullable<
    QueryData<ReturnType<typeof getFavoritesQuery>>[number]["rooms"]
>;
type RoomWithStarred = (BaseRoom extends object[] ? BaseRoom[0] : BaseRoom) & {
    starred_messages?: { id: string }[];
};

type FavoritesQueryResult = {
    room_id: string;
    rooms: RoomWithStarred | null;
};

/**
 * Хук для получения списка "Избранных" чатов.
 * Включает:
 * 1. Чат с самим собой (Saved Messages).
 * 2. Все чаты, содержащие хотя бы одно избранное сообщение.
 */
export function useFavoritesChatList() {
    const { t } = useTranslation();
    const { user, profile } = useAuthStore();

    return useQuery({
        queryKey: QUERY_KEYS.favorites(user?.id),
        queryFn: async (): Promise<FavoritesQueryResult[]> => {
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
            const { data: allRooms, error: allErr } = await getFavoritesQuery(
                user.id,
            );

            if (allErr) {
                console.error("Failed to fetch favorites", allErr);
                throw allErr;
            }

            let results: FavoritesQueryResult[] =
                allRooms?.map((item) => {
                    const roomData = Array.isArray(item.rooms)
                        ? item.rooms[0]
                        : item.rooms;
                    const mapped = {
                        ...item,
                        room_id: item.room_id || "",
                        rooms: roomData
                            ? {
                                  ...roomData,
                                  starred_messages: starredRoomIds.has(
                                      item.room_id || "",
                                  )
                                      ? [{ id: "dummy" }]
                                      : [],
                              }
                            : null,
                    };
                    // Explicitly satisfy the type without casting
                    const typedItem: FavoritesQueryResult = mapped;
                    return typedItem;
                }) || [];

            // 3. GUARANTEE SELF-CHAT (Saved Messages) existence
            // Even if it's not in DB yet, we show it. clicking it will create it via findOrCreateDM logic in ChatRoom
            const deterministicId = await import("@/lib/crypto/rooms").then(
                (m) => m.generateDeterministicRoomId(user.id),
            );

            const hasSelfChat = results.some(
                (r) => r.rooms?.id === deterministicId,
            );

            if (!hasSelfChat) {
                // Add virtual self-chat
                const virtualRoom = {
                    room_id: deterministicId,
                    rooms: {
                        id: deterministicId,
                        name: null, // Will be "Favorites" in selector
                        type: ROOM_TYPE.DIRECT,
                        is_ephemeral: false,
                        last_message: null,
                        room_members: [
                            {
                                user_id: user.id,
                                profiles: {
                                    display_name:
                                        profile?.display_name ||
                                        user.email ||
                                        t("chat.me", "Me"),
                                    avatar_url: profile?.avatar_url || null,
                                },
                            },
                        ],
                        starred_messages: [],
                    },
                };
                const typedVirtualRoom: FavoritesQueryResult = virtualRoom;
                results = [typedVirtualRoom, ...results];
            }

            return results;
        },
        select: (data: FavoritesQueryResult[]): ChatItem[] => {
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
                    const isSelf =
                        (room.type === ROOM_TYPE.DIRECT &&
                            room.room_members.some(
                                (m) => m.user_id === user.id,
                            ) &&
                            (room.room_members.length === 1 ||
                                room.room_members.every(
                                    (m) => m.user_id === user.id,
                                ))) ||
                        false;

                    // 2. Чаты с избранными сообщениями
                    const hasStarred = (room.starred_messages?.length || 0) > 0;

                    if (!isSelf && !hasStarred) {
                        return null;
                    }

                    let displayName = room.name;
                    let avatarUrl: string | undefined;

                    if (isSelf) {
                        displayName = t("chat.favorites", "Избранное");
                    } else if (room.type === ROOM_TYPE.DIRECT) {
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
                        _rawDate:
                            room.last_message?.created_at ||
                            "1970-01-01T00:00:00Z",
                    } as ChatItem & { isSelf: boolean; _rawDate: string };
                })
                .filter(
                    (
                        item,
                    ): item is ChatItem & {
                        isSelf: boolean;
                        _rawDate: string;
                    } => item !== null,
                );

            // Дедупликация:
            // 1. Убираем полные дубликаты по ID
            // 2. Если есть несколько Self-Chats, оставляем только один (самый свежий или детерминированный)
            const uniqueChats = new Map<
                string,
                ChatItem & { isSelf: boolean; _rawDate: string }
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

            return Array.from(uniqueChats.values())
                .sort((a, b) => {
                    // Чат с самим собой (Saved Messages) всегда наверху
                    if (a.isSelf && !b.isSelf) {
                        return -1;
                    }

                    if (!a.isSelf && b.isSelf) {
                        return 1;
                    }

                    // Остальные сортируем по дате последнего сообщения (новые сверху)
                    return (
                        new Date(b._rawDate).getTime() -
                        new Date(a._rawDate).getTime()
                    );
                })
                .map(({ _rawDate, isSelf, ...item }) => item as ChatItem);
        },
        enabled: !!user,
    });
}
