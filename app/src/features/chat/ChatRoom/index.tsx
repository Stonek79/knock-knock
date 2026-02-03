/**
 * Компонент комнаты чата.
 * Поддерживает режим выделения сообщений и редактирование.
 */
import { Box, Container, Flex, Heading } from '@radix-ui/themes';
import { useParams } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { useChatActions } from '@/features/chat/hooks/useChatActions';
import { useChatPeer } from '@/features/chat/hooks/useChatPeer';
import { useChatRoomData } from '@/features/chat/hooks/useChatRoomData';
import { useMessageSelection } from '@/features/chat/hooks/useMessageSelection';
import { useMessages } from '@/features/chat/hooks/useMessages';
import { useUnreadTracking } from '@/features/chat/hooks/useUnreadTracking';
import { MessageInput } from '@/features/chat/MessageInput';
import { MessageList } from '@/features/chat/MessageList';
import { RoomHeader } from '@/features/chat/RoomHeader';
import { useAuthStore } from '@/stores/auth';
import styles from '../chat.module.css';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { EndSessionDialog } from './EndSessionDialog';
import { PrivacyBanner } from './PrivacyBanner';

interface ChatRoomProps {
    roomId: string;
}

export function ChatRoom({ roomId: propRoomId }: ChatRoomProps) {
    const params = useParams({ strict: false }) as Record<
        string,
        string | undefined
    >;
    const roomId = propRoomId || params?.roomId;

    const { t } = useTranslation();
    const { user } = useAuthStore();

    // Состояние диалогов
    const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
    const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] =
        useState(false);

    // Ref для управления скроллом списка сообщений
    const scrollRef = useRef<{ scrollToBottom: () => void } | null>(null);

    // Данные комнаты
    const {
        data: roomInfo,
        isLoading: loading,
        error: fetchError,
    } = useChatRoomData(roomId);

    const room = roomInfo?.room;
    const roomKey = roomInfo?.roomKey;
    const otherUserId = roomInfo?.otherUserId;
    const error = fetchError instanceof Error ? fetchError.message : null;

    // Данные собеседника и сообщений
    const { data: peerUser } = useChatPeer(otherUserId, room?.type);
    const { data: messages = [], isLoading: messagesLoading } = useMessages(
        roomId ?? '',
        roomKey,
    );

    // Действия чата
    const { sendMessage, endSession, deleteMessage, updateMessage, ending } =
        useChatActions({
            roomId,
            roomKey,
            user,
            room,
        });

    // Логика выделения и редактирования
    const {
        selectedMessageIds,
        editingId,
        editingContent,
        canEditSelected,
        toggleSelection,
        clearSelection,
        handleDeleteSelected,
        handleCopySelected,
        handleReplySelected,
        handleForwardSelected,
        handleEditSelected,
        handleMessageUpdate,
        cancelEdit,
    } = useMessageSelection({
        deleteMessage,
        updateMessage,
        user,
        messages,
    });

    // Логика непрочитанных сообщений
    const { firstUnreadId, markAsRead } = useUnreadTracking(
        roomId ?? '',
        messages,
    );

    // Сохраняем время прочтения при размонтировании (выходе из чата)
    useEffect(() => {
        return () => {
            markAsRead();
        };
    }, [markAsRead]);

    // Обработчики диалогов
    const confirmEndSession = async () => {
        await endSession();
        setShowEndSessionDialog(false);
    };

    const handleDeleteRequest = () => {
        if (selectedMessageIds.size > 0) {
            setShowDeleteConfirmDialog(true);
        }
    };

    const confirmDeleteMessages = () => {
        handleDeleteSelected();
        setShowDeleteConfirmDialog(false);
    };

    const handleSend = async (text: string) => {
        if (editingId) {
            await handleMessageUpdate(editingId, text);
        } else {
            await sendMessage(text);
            markAsRead(); // Обновляем статус прочтения при отправке
        }
    };

    // Состояния загрузки и ошибки
    if (loading) {
        return (
            <Flex justify="center" align="center" height="100%">
                <Heading size="3" color="gray">
                    {t('common.loading', 'Загрузка чата...')}
                </Heading>
            </Flex>
        );
    }

    if (error) {
        return (
            <Container size="1" p="4">
                <Alert variant="destructive">
                    <AlertTitle>
                        {t('common.error', 'Ошибка доступа')}
                    </AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </Container>
        );
    }

    if (!roomId) return null;

    return (
        <Flex direction="column" className={styles.roomWrapper}>
            {/* Диалоги */}
            <EndSessionDialog
                open={showEndSessionDialog}
                onOpenChange={setShowEndSessionDialog}
                onConfirm={confirmEndSession}
            />
            <DeleteConfirmDialog
                open={showDeleteConfirmDialog}
                onOpenChange={setShowDeleteConfirmDialog}
                onConfirm={confirmDeleteMessages}
            />

            {/* Заголовок */}
            <RoomHeader
                room={room}
                roomId={roomId}
                peerUser={peerUser}
                onEndSession={() => setShowEndSessionDialog(true)}
                ending={ending}
                selectedCount={selectedMessageIds.size}
                onClearSelection={clearSelection}
                onDeleteSelected={handleDeleteRequest}
                onCopySelected={handleCopySelected}
                onReplySelected={handleReplySelected}
                onForwardSelected={handleForwardSelected}
                onEditSelected={handleEditSelected}
                canEditSelected={canEditSelected}
            />

            {/* Баннер приватности */}
            {room?.is_ephemeral && <PrivacyBanner />}

            {/* Список сообщений */}
            <Box className={styles.messageArea} asChild>
                <main>
                    {roomKey && roomId && (
                        <MessageList
                            messages={messages}
                            messagesLoading={messagesLoading}
                            selectedMessageIds={selectedMessageIds}
                            onToggleSelection={toggleSelection}
                            editingId={editingId}
                            scrollRef={scrollRef}
                            firstUnreadId={firstUnreadId}
                        />
                    )}
                </main>
            </Box>

            {/* Поле ввода */}
            <Box className={styles.inputArea}>
                <MessageInput
                    onSend={handleSend}
                    onCancel={cancelEdit}
                    disabled={
                        !roomKey || !roomId || selectedMessageIds.size > 0
                    }
                    initialValue={editingContent}
                />
            </Box>
        </Flex>
    );
}
