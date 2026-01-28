import {
    Box,
    Button,
    Flex,
    Heading,
    AlertDialog as RadixAlertDialog,
    Text,
} from '@radix-ui/themes';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { MessageInput } from '@/features/chat/MessageInput';
import { MessageList } from '@/features/chat/MessageList';
import { RoomHeader } from '@/features/chat/RoomHeader';
import { DB_TABLES } from '@/lib/constants';
import { base64ToArrayBuffer, getKeyPair } from '@/lib/crypto';
import { unwrapRoomKey } from '@/lib/crypto/encryption';
import { logger } from '@/lib/logger';
import { ChatService } from '@/lib/services/chat';
import { supabase } from '@/lib/supabase';
import type { Room } from '@/lib/types/chat';
import { useAuthStore } from '@/stores/auth';
import styles from '../chat.module.css';

/**
 * Компонент комнаты чата.
 * Отвечает за загрузку метаданных комнаты, разблокировку ключей и отображение списка сообщений.
 */
export function ChatRoom() {
    const { roomId } = useParams({ from: '/chat/$roomId' });
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
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
            if (import.meta.env.VITE_USE_MOCK === 'true') {
                const mockKey = await window.crypto.subtle.generateKey(
                    { name: 'AES-GCM', length: 256 },
                    true,
                    ['encrypt', 'decrypt'],
                );
                return {
                    room: roomData as Room,
                    roomKey: mockKey,
                };
            }

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

    const confirmEndSession = async () => {
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
            setShowEndSessionDialog(false);
        }
    };

    if (loading)
        return (
            <Box p="4">
                <Heading size="3">{t('common.loading', 'Загрузка...')}</Heading>
            </Box>
        );

    if (error)
        return (
            <Box p="4">
                <Alert variant="destructive">
                    <AlertTitle>{t('common.error', 'Ошибка')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </Box>
        );

    return (
        <div className={styles.roomWrapper}>
            {/* Диалог подтверждения удаления чата */}
            <RadixAlertDialog.Root
                open={showEndSessionDialog}
                onOpenChange={setShowEndSessionDialog}
            >
                <RadixAlertDialog.Content maxWidth="450px">
                    <RadixAlertDialog.Title>
                        {t('chat.endSessionTitle', 'Завершить сеанс?')}
                    </RadixAlertDialog.Title>
                    <RadixAlertDialog.Description>
                        {t(
                            'chat.endSessionConfirm',
                            'Вы уверены? История чата будет удалена навсегда.',
                        )}
                    </RadixAlertDialog.Description>
                    <Flex gap="3" mt="4" justify="end">
                        <RadixAlertDialog.Cancel>
                            <Button variant="soft" color="gray">
                                {t('common.cancel', 'Отмена')}
                            </Button>
                        </RadixAlertDialog.Cancel>
                        <RadixAlertDialog.Action>
                            <Button color="red" onClick={confirmEndSession}>
                                {t('chat.endSessionAction', 'Удалить')}
                            </Button>
                        </RadixAlertDialog.Action>
                    </Flex>
                </RadixAlertDialog.Content>
            </RadixAlertDialog.Root>

            <RoomHeader
                room={room}
                roomId={roomId}
                onEndSession={() => setShowEndSessionDialog(true)}
                ending={ending}
            />

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
