import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
    CLIENT_MESSAGE_STATUS,
    OPTIMISTIC_ID_PREFIX,
    QUERY_KEYS,
} from "@/lib/constants";
import { logger } from "@/lib/logger";
import { messageRepository } from "@/lib/repositories/message.repository";
import { ChatRealtimeService } from "@/lib/services/chat-realtime";
import type { ChatMessage } from "@/lib/types";
import { decryptMessagePayload } from "@/lib/utils/decryptPayload";
import { useAuthStore } from "@/stores/auth";

type UseMessagesProps = {
    roomId: string;
    roomKey?: CryptoKey;
};

/**
 * Хук для загрузки истории сообщений и управления контекстом дешифровки.
 *
 * @param props - { roomId, roomKey }
 */
export function useMessages({ roomId, roomKey }: UseMessagesProps) {
    const pbUser = useAuthStore((state) => state.pbUser);

    // Сообщаем сервису об активной комнате для дешифровки входящих событий
    useEffect(() => {
        if (roomId && roomKey) {
            ChatRealtimeService.setActiveRoom({ id: roomId, key: roomKey });
            return () => {
                ChatRealtimeService.clearActiveRoom();
            };
        }
    }, [roomId, roomKey]);

    const queryClient = useQueryClient();

    return useQuery({
        queryKey: QUERY_KEYS.messages(roomId),
        queryFn: async (): Promise<ChatMessage[]> => {
            if (!roomId || !roomKey || !pbUser) {
                return [];
            }

            // Получаем текущие сообщения из кэша TanStack Query ДО отправки запроса на сервер
            const cachedMessages =
                queryClient.getQueryData<ChatMessage[]>(
                    QUERY_KEYS.messages(roomId),
                ) ?? [];

            const failedOrSendingMessages = cachedMessages.filter((m) => {
                return (
                    m._uiStatus === CLIENT_MESSAGE_STATUS.FAILED ||
                    m._uiStatus === CLIENT_MESSAGE_STATUS.SENDING ||
                    m.id.startsWith(OPTIMISTIC_ID_PREFIX)
                );
            });

            const result = await messageRepository.getRoomMessages(roomId);
            if (result.isErr()) {
                logger.error(
                    `useMessages [${roomId}]: load failed`,
                    result.error,
                );
                throw new Error(result.error.message);
            }

            const records = result.value;
            const decrypted: ChatMessage[] = [];

            for (const record of records) {
                // 1. Глобально удаленные (старые артефакты Soft Delete из прошлых версий)
                if (record.is_deleted) {
                    continue;
                }

                // 2. Локальное скрытие (Local Hide) - если пользователь сам скрыл сообщение
                const rawDeletedBy = record.metadata?.deleted_by;
                const deletedBy = Array.isArray(rawDeletedBy)
                    ? rawDeletedBy
                    : [];
                if (deletedBy.includes(pbUser.id)) {
                    continue;
                }

                // Дешифровка контента для истории через общую утилиту
                const content = await decryptMessagePayload(record, roomKey);

                // Используем маппер для создания доменного объекта
                decrypted.push({
                    ...record,
                    content,
                });
            }

            // Объединяем успешные сообщения с сервера и локальные упавшие/отправляющиеся сообщения
            const allMessages = [...decrypted, ...failedOrSendingMessages];

            // Сортируем объединенный список по дате
            return allMessages.sort((a, b) => {
                return (
                    new Date(a.created).getTime() -
                    new Date(b.created).getTime()
                );
            });
        },
        enabled: !!roomId && !!roomKey && !!pbUser,
    });
}
