import { Flex, ScrollArea, Text } from '@radix-ui/themes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { DB_TABLES } from '@/lib/constants';
import { decryptMessage } from '@/lib/crypto/messages';
import { logger } from '@/lib/logger';
import { isMock, supabase } from '@/lib/supabase';
import type { Message } from '@/lib/types/chat';
import { useAuthStore } from '@/stores/auth';
import { MessageBubble } from '../MessageBubble';
import styles from './message-list.module.css';

interface MessageListProps {
    roomId: string;
    roomKey: CryptoKey;
}

/**
 * Тип расшифрованного сообщения.
 */
interface DecryptedMessage extends Omit<Message, 'content'> {
    content: string;
}

/**
 * Компонент списка сообщений.
 * Использует TanStack Query для загрузки и Realtime для обновлений.
 */
export function MessageList({ roomId, roomKey }: MessageListProps) {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const scrollViewportRef = useRef<HTMLDivElement>(null);

    /**
     * Запрос сообщений с автоматической расшифровкой.
     */
    const { data: messages = [], isLoading: loading } = useQuery({
        queryKey: ['messages', roomId],
        queryFn: async (): Promise<DecryptedMessage[]> => {
            const { data, error } = await supabase
                .from(DB_TABLES.MESSAGES)
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const decrypted: DecryptedMessage[] = [];
            for (const msg of data as Message[]) {
                if (isMock) {
                    decrypted.push({ ...msg, content: msg.content });
                    continue;
                }
                try {
                    const content = await decryptMessage(
                        msg.content,
                        msg.iv,
                        roomKey,
                    );
                    decrypted.push({ ...msg, content });
                } catch (e) {
                    logger.error(`Failed to decrypt message ${msg.id}`, e);
                    decrypted.push({ ...msg, content: '🔒 Decryption failed' });
                }
            }
            return decrypted;
        },
        enabled: !!roomId && !!roomKey,
    });

    /**
     * Подписка на Realtime изменения.
     */
    useEffect(() => {
        const channel = supabase
            .channel(`room:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: DB_TABLES.MESSAGES,
                    filter: `room_id=eq.${roomId}`,
                },
                async (payload) => {
                    const newMsg = payload.new as Message;
                    if (isMock) {
                        const decryptedNewMsg: DecryptedMessage = {
                            ...newMsg,
                            content: newMsg.content,
                        };
                        queryClient.setQueryData(
                            ['messages', roomId],
                            (old: DecryptedMessage[] | undefined) => [
                                ...(old || []),
                                decryptedNewMsg,
                            ],
                        );
                        return;
                    }
                    try {
                        const content = await decryptMessage(
                            newMsg.content,
                            newMsg.iv,
                            roomKey,
                        );
                        const decryptedNewMsg: DecryptedMessage = {
                            ...newMsg,
                            content,
                        };

                        queryClient.setQueryData(
                            ['messages', roomId],
                            (old: DecryptedMessage[] | undefined) => [
                                ...(old || []),
                                decryptedNewMsg,
                            ],
                        );
                    } catch (e) {
                        logger.error(
                            `Failed to decrypt realtime message ${newMsg.id}`,
                            e,
                        );
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, roomKey, queryClient]);

    /**
     * Автоматический скролл вниз.
     */
    useEffect(() => {
        if (scrollViewportRef.current) {
            scrollViewportRef.current.scrollTop =
                scrollViewportRef.current.scrollHeight;
        }
    }, []);

    if (loading) {
        return (
            <div className={styles.loadingBox}>
                <Text color="gray">
                    {user?.id ? 'Загрузка сообщений...' : 'Авторизация...'}
                </Text>
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className={styles.emptyBox}>
                <Text color="gray">Нет сообщений</Text>
            </div>
        );
    }

    return (
        <ScrollArea
            type="always"
            scrollbars="vertical"
            className={styles.scrollArea}
        >
            <div className={styles.viewport} ref={scrollViewportRef}>
                <Flex direction="column" gap="2">
                    {messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            content={msg.content}
                            isOwn={user?.id === msg.sender_id}
                            timestamp={msg.created_at}
                        />
                    ))}
                </Flex>
            </div>
        </ScrollArea>
    );
}
