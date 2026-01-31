import {
    Box,
    Button,
    Flex,
    Heading,
    AlertDialog as RadixAlertDialog,
    Text,
} from '@radix-ui/themes';
import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { useChatActions } from '@/features/chat/hooks/useChatActions';
import { useChatPeer } from '@/features/chat/hooks/useChatPeer';
import { useChatRoomData } from '@/features/chat/hooks/useChatRoomData';
import { MessageInput } from '@/features/chat/MessageInput';
import { MessageList } from '@/features/chat/MessageList';
import { RoomHeader } from '@/features/chat/RoomHeader';
import { useAuthStore } from '@/stores/auth';
import styles from '../chat.module.css';

/**
 * Компонент комнаты чата.
 * Отвечает за загрузку метаданных комнаты, разблокировку ключей и отображение списка сообщений.
 */
interface ChatRoomProps {
    roomId?: string;
}

export function ChatRoom({ roomId: propRoomId }: ChatRoomProps) {
    const params = useParams({ strict: false }) as Record<
        string,
        string | undefined
    >;
    const roomId = propRoomId || params?.roomId;

    const { t } = useTranslation();
    const { user } = useAuthStore();

    const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);

    /**
     * Загрузка данных комнаты через кастомный хук.
     * Вся логика шифрования и выбора режима (Mock/Prod) инкапсулирована внутри.
     */
    const {
        data: roomInfo,
        isLoading: loading,
        error: fetchError,
    } = useChatRoomData(roomId); // Pass the resolved roomId

    const room = roomInfo?.room;
    const roomKey = roomInfo?.roomKey;
    const otherUserId = roomInfo?.otherUserId;
    const error = fetchError instanceof Error ? fetchError.message : null;

    /**
     * Для DM-чатов загружаем данные собеседника.
     */
    const { data: peerUser } = useChatPeer(otherUserId, room?.type);

    /**
     * Бизнес-логика (отправка, удаление) вынесена в хук
     */
    const { sendMessage, endSession, ending } = useChatActions({
        roomId,
        roomKey,
        user,
        room,
    });

    const confirmEndSession = async () => {
        await endSession();
        setShowEndSessionDialog(false);
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

    if (!roomId) return null;

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
                peerUser={peerUser}
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
                {roomKey && roomId && (
                    <MessageList roomId={roomId} roomKey={roomKey} />
                )}
            </main>

            <footer className={styles.inputArea}>
                <MessageInput
                    onSend={sendMessage}
                    disabled={!roomKey || !roomId}
                />
            </footer>
        </div>
    );
}
