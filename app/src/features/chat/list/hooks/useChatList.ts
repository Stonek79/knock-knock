import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { QUERY_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { getUserRoomsWithLastMessages } from "@/lib/services/room";
import { roomListDb } from "@/lib/services/room-list-db";
import { sessionGuard } from "@/lib/services/session-cleanup";
import type { ExtendedChatItem, RoomWithMembers } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";
import { decryptRoomPreviews } from "../utils/decryptPreviews";
import { mapRoomToChatItem } from "../utils/roomUiMapper";

/**
 * Хук для получения и обработки списка чатов текущего пользователя.
 *
 * Использует cache-first стратегию:
 * 1. При отсутствии данных в React Query читает список комнат из постоянного
 *    IndexedDB-кеша (разделяется по userId и PB environment). Список
 *    отображается сразу, без ожидания сервера.
 * 2. Серверное обновление (включая последние сообщения) выполняется в фоне и
 *    обновляет кеш и query после завершения.
 * 3. Постоянный кеш убирает ожидание N+1-запросов последних сообщений из
 *    критического пути отрисовки после reload.
 * 4. Маппит данные в формат ChatItem, локализует названия и сортирует список.
 *
 * @returns {UseQueryResult<ChatItem[]>} Объект с данными чатов, статусом загрузки и ошибками.
 */
export function useChatList() {
    const { t } = useTranslation();
    const pbUser = useAuthStore((state) => state.pbUser);
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: QUERY_KEYS.rooms(pbUser?.id),
        queryFn: async (): Promise<RoomWithMembers[]> => {
            if (!pbUser) {
                return [];
            }

            const userId = pbUser.id;
            // Session guard: ответ, завершившийся после logout/смены пользователя,
            // не должен писать в IndexedDB или QueryClient.
            const sessionAtStart = sessionGuard.current();
            const isCurrentSession = (): boolean =>
                sessionGuard.current() === sessionAtStart;

            // Серверная загрузка (N+1-запрос last-msgs вне критического пути).
            const loadFresh = async (): Promise<RoomWithMembers[]> => {
                const result = await getUserRoomsWithLastMessages(userId);
                if (result.isErr()) {
                    throw result.error;
                }
                return result.value;
            };

            // Сохраняем raw-кеш (только ciphertext) fire-and-forget: НЕ блокирует
            // показ свежих данных и выполняется только если сессия актуальна.
            const saveRawCache = (rawRooms: RoomWithMembers[]): void => {
                if (!isCurrentSession()) {
                    return;
                }
                void roomListDb.save(userId, rawRooms).catch(() => {
                    logger.warn("useChatList: не удалось обновить кеш комнат");
                });
            };

            // Если в React Query уже есть данные (инвалидация, refetch, realtime),
            // не «откатываем» список к кешу — грузим с сервера.
            const existing = queryClient.getQueryData<RoomWithMembers[]>(
                QUERY_KEYS.rooms(userId),
            );

            if (!existing) {
                // cache-first из локального кеша (изоляция по userId/PB URL).
                // `[]` — корректный cache hit; null/повреждённый кеш — cache miss.
                const cached = await roomListDb.load(userId).catch(() => null);

                if (isCurrentSession() && cached) {
                    const cachedPreview = await decryptRoomPreviews(
                        cached,
                        userId,
                    );

                    // Показываем из кеша мгновенно, сервер синхронизируем в фоне.
                    void (async () => {
                        try {
                            const raw = await loadFresh();
                            if (!isCurrentSession()) {
                                return;
                            }
                            // Защита от устаревшего ответа: если за время фоновой
                            // синхронизации realtime/optimistic код заменил наш
                            // кеш-снимок свежими данными — не перезаписываем их и
                            // НЕ пишем устаревший снимок в IndexedDB.
                            const current = queryClient.getQueryData<
                                RoomWithMembers[]
                            >(QUERY_KEYS.rooms(userId));
                            if (current !== cachedPreview) {
                                return;
                            }
                            saveRawCache(raw);
                            const fresh = await decryptRoomPreviews(
                                raw,
                                userId,
                            );
                            queryClient.setQueryData(
                                QUERY_KEYS.rooms(userId),
                                fresh,
                            );
                        } catch {
                            logger.error(
                                "useChatList: фоновая синхронизация не удалась",
                            );
                        }
                    })();
                    return cachedPreview;
                }
            }

            // Cache miss / недоступный кеш — грузим с сервера (fallback)
            const raw = await loadFresh();
            if (!isCurrentSession()) {
                // Сессия завершилась: не пишем старые данные в IndexedDB/QueryClient.
                return [];
            }
            // Не затираем более свежие realtime/optimistic данные, заменившие
            // текущий снимок, пока выполнялся серверный запрос.
            const current = queryClient.getQueryData<RoomWithMembers[]>(
                QUERY_KEYS.rooms(userId),
            );
            const shouldApply = current === existing;
            if (shouldApply) {
                saveRawCache(raw);
            }
            const fresh = await decryptRoomPreviews(raw, userId);
            return shouldApply ? fresh : (current ?? fresh);
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
