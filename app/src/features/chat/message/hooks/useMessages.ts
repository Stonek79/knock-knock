import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
    CLIENT_MESSAGE_STATUS,
    OPTIMISTIC_ID_PREFIX,
    QUERY_KEYS,
} from "@/lib/constants";
import { logger } from "@/lib/logger";
import { messageRepository } from "@/lib/repositories/message.repository";
import { SealedSenderUtil } from "@/lib/services/chat-crypto";
import { ChatRealtimeService } from "@/lib/services/chat-realtime";
import type { ChatMessage, MessageRow } from "@/lib/types";
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
                    m._uiStatus === CLIENT_MESSAGE_STATUS.QUEUED ||
                    m.id.startsWith(OPTIMISTIC_ID_PREFIX)
                );
            });

            const processAndDecryptMessages = async (
                records: MessageRow[],
            ): Promise<ChatMessage[]> => {
                const decrypted: ChatMessage[] = [];
                for (const record of records) {
                    if (record.is_deleted) {
                        continue;
                    }

                    const rawDeletedBy = record.metadata?.deleted_by;
                    const deletedBy = Array.isArray(rawDeletedBy)
                        ? rawDeletedBy
                        : [];
                    if (deletedBy.includes(pbUser.id)) {
                        continue;
                    }

                    const content = await decryptMessagePayload(
                        record,
                        roomKey,
                    );

                    let finalContent = content;
                    if (content) {
                        const unpacked = SealedSenderUtil.unpack(content);
                        finalContent = unpacked.text;
                        if (unpacked.sender_uuid) {
                            record.sender = unpacked.sender_uuid;
                        }
                    }

                    decrypted.push({
                        ...record,
                        content: finalContent,
                    });
                }
                return decrypted;
            };

            const localResult = await messageRepository.getLocalRoomMessages(
                roomId,
                pbUser.id,
            );
            const localRecords = localResult.isOk() ? localResult.value : [];
            const decryptedLocal =
                await processAndDecryptMessages(localRecords);

            const allLocal = [
                ...decryptedLocal,
                ...failedOrSendingMessages,
            ].sort(
                (a, b) =>
                    new Date(a.created).getTime() -
                    new Date(b.created).getTime(),
            );

            // Асинхронно синхронизируем с сервером
            (async () => {
                try {
                    const serverResult =
                        await messageRepository.getRoomMessages(roomId);
                    if (serverResult.isErr()) {
                        logger.error(
                            `useMessages [${roomId}]: background sync failed`,
                            serverResult.error,
                        );
                        return;
                    }

                    const serverRecords = serverResult.value;

                    // Сохраняем новые данные в локальную БД
                    await messageRepository.saveLocalMessages(
                        pbUser.id,
                        serverRecords,
                    );

                    const decryptedServer =
                        await processAndDecryptMessages(serverRecords);

                    const allServer = [
                        ...decryptedServer,
                        ...failedOrSendingMessages,
                    ].sort(
                        (a, b) =>
                            new Date(a.created).getTime() -
                            new Date(b.created).getTime(),
                    );

                    // Обновляем кэш TanStack Query
                    queryClient.setQueryData(
                        QUERY_KEYS.messages(roomId),
                        allServer,
                    );
                } catch (e) {
                    logger.error(`useMessages [${roomId}]: sync error`, e);
                }
            })();

            return allLocal;
        },
        enabled: !!roomId && !!roomKey && !!pbUser,
    });
}
