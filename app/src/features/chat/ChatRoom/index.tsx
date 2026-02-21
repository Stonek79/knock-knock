import { Container } from "@/components/layout/Container";
import { Flex } from "@/components/layout/Flex";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import styles from "./chatroom.module.css";
import { ChatRoomDialogs } from "./components/ChatRoomDialogs";
import { ChatRoomHeader } from "./components/ChatRoomHeader";
import { ChatRoomInputArea } from "./components/ChatRoomInputArea";
import { ChatRoomLayout } from "./components/ChatRoomLayout";
import { ChatRoomMessages } from "./components/ChatRoomMessages";
import { PrivacyBanner } from "./components/PrivacyBanner";
import { useChatRoom } from "./hooks/useChatRoom";
import { ChatRoomProvider } from "./store";

interface ChatRoomProps {
    roomId: string;
}

/**
 * Основной компонент комнаты чата.
 * Служит входной точкой, оборачивает контент в Provider и управляет Layout.
 */
export function ChatRoom({ roomId }: ChatRoomProps) {
    return (
        <ChatRoomProvider key={roomId}>
            <ChatRoomInternal roomId={roomId} />
        </ChatRoomProvider>
    );
}

/**
 * Внутренний контент комнаты, имеющий доступ к ChatRoomStore.
 */
function ChatRoomInternal({ roomId }: { roomId: string }) {
    const {
        t,
        user,
        room,
        roomKey,
        peerUser,
        messages,
        messagesLoading,
        isLoading,
        isFavoritesView,
        error,
        typingUsers,
        setTyping,
        ending,
        firstUnreadId,
        scrollRef,
        showEndSessionDialog,
        setShowEndSessionDialog,
        showDeleteConfirmDialog,
        setShowDeleteConfirmDialog,
        handleSend,
        handleDeleteSelected,
        handleCopySelected,
        confirmEndSession,
    } = useChatRoom(roomId);

    if (isLoading) {
        return (
            <Flex justify="center" align="center" height="100%">
                {/* Нативный span вместо Radix Heading */}
                <span className={styles.loadingText}>
                    {t("common.loading", "Загрузка чата...")}
                </span>
            </Flex>
        );
    }

    if (error) {
        return (
            <Container size="1" p="4">
                <Alert variant="destructive">
                    <AlertTitle>
                        {t("common.error", "Ошибка доступа")}
                    </AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </Container>
        );
    }

    return (
        <ChatRoomLayout
            dialogs={
                <ChatRoomDialogs
                    showEndSession={showEndSessionDialog}
                    onEndSessionChange={setShowEndSessionDialog}
                    onEndSessionConfirm={confirmEndSession}
                    showDeleteConfirm={showDeleteConfirmDialog}
                    onDeleteConfirmChange={setShowDeleteConfirmDialog}
                    onDeleteConfirm={handleDeleteSelected}
                />
            }
            header={
                <ChatRoomHeader
                    room={room}
                    roomId={roomId}
                    peerUser={peerUser}
                    onEndSession={() => setShowEndSessionDialog(true)}
                    ending={ending}
                    onDeleteSelected={() => setShowDeleteConfirmDialog(true)}
                    onCopySelected={handleCopySelected}
                    onReplySelected={() => console.log("Reply")}
                    onForwardSelected={() => console.log("Forward")}
                    messages={messages}
                    userId={user?.id}
                    typingUsers={typingUsers}
                />
            }
            banner={room?.is_ephemeral ? <PrivacyBanner /> : null}
            messages={
                <ChatRoomMessages
                    messages={messages}
                    isLoading={messagesLoading}
                    roomId={roomId}
                    roomKey={roomKey}
                    scrollRef={scrollRef}
                    firstUnreadId={firstUnreadId}
                    userId={user?.id}
                    isFavoritesView={isFavoritesView}
                />
            }
            input={
                <ChatRoomInputArea
                    onSend={handleSend}
                    disabled={!roomKey}
                    onTyping={setTyping}
                />
            }
        />
    );
}
