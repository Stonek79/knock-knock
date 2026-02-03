import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { DB_TABLES, REALTIME_EVENTS } from '@/lib/constants/chat';
import { decryptMessage } from '@/lib/crypto/messages';
import { logger } from '@/lib/logger';
import { MessageService } from '@/lib/services/message';
import { isMock, supabase } from '@/lib/supabase';
import type {
    DecryptedMessageWithProfile,
    MessageRow,
} from '@/lib/types/message';

interface UseMessageSubscriptionProps {
    roomId: string;
    roomKey?: CryptoKey;
    userId?: string;
}

/**
 * Хук подписки на Realtime обновления чата.
 * Слушает события базы данных (INSERT, UPDATE) и обновляет кэш сообщений.
 */
export function useMessageSubscription({
    roomId,
    roomKey,
    userId,
}: UseMessageSubscriptionProps) {
    const queryClient = useQueryClient();

    /**
     * Расшифровывает сообщение.
     * Если сообщение удалено или mock-режим — возвращает соответствующий контент.
     */
    const decryptPayload = useCallback(
        async (msg: MessageRow) => {
            if (msg.is_deleted || msg.content === null) return null;
            if (isMock) return msg.content;
            if (!msg.iv) return null;
            // Проверка roomKey нужна для TS, хотя useEffect перезапускается при его смене
            if (!roomKey) return null;

            return await decryptMessage(msg.content, msg.iv, roomKey);
        },
        [roomKey],
    );

    /**
     * Обработка нового сообщения (INSERT).
     * - Расшифровывает.
     * - Добавляет в кэш.
     * - Отмечает как "Доставлено", если сообщение от другого пользователя.
     */
    const handleInsert = useCallback(
        async (payload: RealtimePostgresChangesPayload<MessageRow>) => {
            const newMsgRaw = payload.new as MessageRow;
            try {
                const decryptedContent = await decryptPayload(newMsgRaw);
                const newMsg: DecryptedMessageWithProfile = {
                    ...newMsgRaw,
                    content: decryptedContent,
                    profiles: null, // Профиль подтянется при обновлении или отдельным запросом
                };

                // Если сообщение от собеседника — отмечаем как доставленное
                if (userId && newMsgRaw.sender_id !== userId) {
                    MessageService.markMessageAsDelivered(newMsgRaw.id).catch(
                        (err) => {
                            logger.error('Failed to mark delivered', err);
                        },
                    );
                }

                // Обновляем кэш React Query
                queryClient.setQueryData(
                    ['messages', roomId],
                    (old: DecryptedMessageWithProfile[] | undefined) => {
                        if (!old) return [newMsg];
                        // Избегаем дубликатов
                        if (old.some((m) => m.id === newMsg.id)) return old;
                        return [...old, newMsg];
                    },
                );
            } catch (error) {
                logger.error('Error handling INSERT message', error);
            }
        },
        [decryptPayload, queryClient, roomId, userId],
    );

    /**
     * Обработка обновления сообщения (UPDATE).
     * - Используется для статусов (read/delivered), редактирования и "мягкого" удаления.
     */
    const handleUpdate = useCallback(
        async (payload: RealtimePostgresChangesPayload<MessageRow>) => {
            const newMsgRaw = payload.new as MessageRow;
            try {
                const decryptedContent = await decryptPayload(newMsgRaw);

                queryClient.setQueryData(
                    ['messages', roomId],
                    (old: DecryptedMessageWithProfile[] | undefined) => {
                        if (!old) return old;

                        // Если сообщение удалено глобально и оно свое -> удаляем его из кэша
                        if (
                            newMsgRaw.is_deleted &&
                            newMsgRaw.sender_id === userId
                        ) {
                            return old.filter((m) => m.id !== newMsgRaw.id);
                        }

                        // Если сообщение удалено локально (Delete for Me)
                        if (newMsgRaw.deleted_by?.includes(userId || '')) {
                            return old.filter((m) => m.id !== newMsgRaw.id);
                        }

                        return old.map((m) => {
                            if (m.id === newMsgRaw.id) {
                                const filteredContent = newMsgRaw.is_deleted
                                    ? null
                                    : decryptedContent;

                                // Сохраняем существующий профиль, обновляем поля сообщения
                                return {
                                    ...m,
                                    ...newMsgRaw,
                                    content: filteredContent,
                                    profiles: m.profiles,
                                };
                            }
                            return m;
                        });
                    },
                );
            } catch (error) {
                logger.error('Error handling UPDATE message', error);
            }
        },
        [decryptPayload, queryClient, roomId, userId],
    );

    useEffect(() => {
        // Не создаем подписку, пока нет необходимых данных
        if (!roomId || !roomKey) return;

        // Создаем канал подписки
        const channel = supabase
            .channel(`room:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: DB_TABLES.MESSAGES,
                    filter: `room_id=eq.${roomId}`,
                },
                (payload: RealtimePostgresChangesPayload<MessageRow>) => {
                    if (payload.eventType === REALTIME_EVENTS.INSERT) {
                        handleInsert(payload);
                    } else if (payload.eventType === REALTIME_EVENTS.UPDATE) {
                        handleUpdate(payload);
                    }
                },
            )
            .subscribe((status) => {
                console.log(
                    'Realtime Subscription Status:',
                    status,
                    'Room:',
                    roomId,
                ); // DEBUG LOG
            });

        // Очистка при размонтировании
        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, roomKey, handleInsert, handleUpdate]);
}
