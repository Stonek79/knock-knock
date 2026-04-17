import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { QUERY_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { messageRepository } from "@/lib/repositories/message.repository";
import { ChatRealtimeService } from "@/lib/services/chat-realtime";
import type { DecryptedMessageWithProfile } from "@/lib/types";
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

    return useQuery({
        queryKey: QUERY_KEYS.messages(roomId),
        queryFn: async (): Promise<DecryptedMessageWithProfile[]> => {
            if (!roomId || !roomKey || !pbUser) {
                return [];
            }

            const result = await messageRepository.getRoomMessages(roomId);
            if (result.isErr()) {
                logger.error(
                    `useMessages [${roomId}]: load failed`,
                    result.error,
                );
                throw new Error(result.error.message);
            }

            const records = result.value;
            const decrypted: DecryptedMessageWithProfile[] = [];

            for (const record of records) {
                // 1. Физически удаленные из БД (мягкое удаление для всех)
                // Если is_deleted: true, сообщение остается в списке, но с пустым контентом (если нужно)

                // 2. Локальное скрытие (Local Hide) - если пользователь сам скрыл сообщение
                const metadata = record.metadata;
                const deletedBy = metadata.deleted_by;
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

            // Сортируем по дате, так как getRoomMessages может вернуть в обратном порядке (getList)
            return decrypted.sort(
                (a, b) =>
                    new Date(a.created_at).getTime() -
                    new Date(b.created_at).getTime(),
            );
        },
        enabled: !!roomId && !!roomKey && !!pbUser,
    });
}
