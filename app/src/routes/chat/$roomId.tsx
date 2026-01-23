import { Box, Heading, Text } from '@radix-ui/themes';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageInput } from '@/components/chat/MessageInput';
import { MessageList } from '@/components/chat/MessageList';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { DB_TABLES } from '@/lib/constants';
import { base64ToArrayBuffer, getKeyPair } from '@/lib/crypto'; // Direct import of IDB wrapper
import { unwrapRoomKey } from '@/lib/crypto/encryption';
import { logger } from '@/lib/logger';
import { ChatService } from '@/lib/services/chat';
import { supabase } from '@/lib/supabase';
import type { Room } from '@/lib/types/chat';
import { useAuthStore } from '@/stores/auth';
import styles from './chat.module.css';

export const Route = createFileRoute('/chat/$roomId')({
    component: ChatRoom,
});

/**
 * Компонент комнаты чата.
 * Отвечает за загрузку метаданных комнаты, разблокировку ключей и отображение списка сообщений.
 */
function ChatRoom() {
    const { roomId } = Route.useParams();
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [ending, setEnding] = useState(false);

    /**
     * Запрос на загрузку и "разблокировку" комнаты.
     * Возвращает метаданные комнаты и расшифрованный CryptoKey.
     */
    const {
        data: roomInfo,
        isLoading: loading,
        error: fetchError,
    } = useQuery({
        queryKey: ['room', roomId, user?.id],
        queryFn: async () => {
            if (!user) throw new Error('Unauthorized');

            // 1. Загружаем метаданные комнаты
            const { data: roomData, error: roomFetchError } = await supabase
                .from(DB_TABLES.ROOMS)
                .select('*')
                .eq('id', roomId)
                .single();

            if (roomFetchError || !roomData) {
                throw new Error(t('chat.errors.accessDenied'));
            }

            // 2. Загружаем зашифрованный ключ комнаты для текущего пользователя
            const { data: keyData, error: keyFetchError } = await supabase
                .from(DB_TABLES.ROOM_KEYS)
                .select('encrypted_key')
                .eq('room_id', roomId)
                .eq('user_id', user.id)
                .single();

            if (keyFetchError || !keyData) {
                throw new Error(t('chat.errors.accessDenied'));
            }

            // 3. Загружаем приватный ключ идентификации пользователя (X25519) из IndexedDB
            const identity = await getKeyPair('identity');
            if (!identity) {
                throw new Error(t('chat.errors.keysMissing'));
            }

            // 4. Расшифровываем ключ комнаты
            const encryptedData = JSON.parse(keyData.encrypted_key);
            const roomKey = await unwrapRoomKey(
                {
                    ephemeralPublicKey: base64ToArrayBuffer(
                        encryptedData.ephemeralPublicKey,
                    ),
                    iv: base64ToArrayBuffer(encryptedData.iv),
                    ciphertext: base64ToArrayBuffer(encryptedData.ciphertext),
                },
                identity.privateKey,
            );

            return {
                room: roomData as Room,
                roomKey,
            };
        },
        enabled: !!user && !!roomId,
    });

    const room = roomInfo?.room;
    const roomKey = roomInfo?.roomKey;
    const error = fetchError instanceof Error ? fetchError.message : null;

    const handleSendMessage = async (text: string) => {
        if (!roomKey || !user) return;
        try {
            await ChatService.sendMessage(roomId, user.id, text, roomKey);
        } catch (e) {
            logger.error('Failed to send message', e);
        }
    };

    const handleEndSession = async () => {
        if (
            !window.confirm(
                t(
                    'chat.endSessionConfirm',
                    'Вы уверены? История чата будет удалена навсегда.',
                ),
            )
        )
            return;

        setEnding(true);
        try {
            await ChatService.clearRoom(roomId);
            // Если чат эфемерный, можно удалить и саму комнату
            if (room?.is_ephemeral) {
                await ChatService.deleteRoom(roomId);
            }
            navigate({ to: '/chat' });
        } catch (e) {
            logger.error('Failed to end session', e);
        } finally {
            setEnding(false);
        }
    };

    if (loading)
        return (
            <Box p="4">
                <Heading size="3">{t('common.loading', 'Loading...')}</Heading>
            </Box>
        );

    if (error)
        return (
            <Box p="4">
                <Alert variant="destructive">
                    <AlertTitle>{t('common.error', 'Error')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </Box>
        );

    return (
        <div className={styles.roomWrapper}>
            <header className={styles.roomHeader}>
                <Heading size="4">
                    {room?.is_ephemeral ? '🔒 ' : ''}
                    {room?.name || `Chat ${roomId.slice(0, 8)}...`}
                </Heading>

                {room?.is_ephemeral && (
                    <Button
                        color="red"
                        variant="soft"
                        size="1"
                        onClick={handleEndSession}
                        loading={ending}
                    >
                        <Trash2 size={16} />
                        {t('chat.endSession')}
                    </Button>
                )}
            </header>

            {room?.is_ephemeral && (
                <div className={styles.privacyBanner}>
                    <Text size="1" color="orange">
                        ⚠️ {t('chat.privacyWarning')}
                    </Text>
                </div>
            )}

            <main className={styles.messageArea}>
                {roomKey && <MessageList roomId={roomId} roomKey={roomKey} />}
            </main>

            <footer className={styles.inputArea}>
                <MessageInput onSend={handleSendMessage} disabled={!roomKey} />
            </footer>
        </div>
    );
}
