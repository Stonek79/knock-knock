import type { RefObject } from "react";
import { Box } from "@/components/layout/Box";
import { MessageList } from "@/features/chat/message";
import type { DecryptedMessageWithProfile } from "@/lib/types/message";
import styles from "../chatroom.module.css";
import { useChatRoomStore } from "../store";

interface ChatRoomMessagesProps {
    messages: DecryptedMessageWithProfile[];
    isLoading: boolean;
    roomId: string;
    roomKey?: CryptoKey;
    scrollRef: RefObject<{ scrollToBottom: () => void } | null>;
    firstUnreadId: string | null;
    userId?: string;
    isFavoritesView?: boolean;
}

/**
 * Секция сообщений с интеграцией локального стора.
 */
export function ChatRoomMessages({
    messages,
    isLoading,
    roomId,
    roomKey,
    scrollRef,
    firstUnreadId,
    userId,
    isFavoritesView = false,
}: ChatRoomMessagesProps) {
    const selectedMessageIds = useChatRoomStore((s) => s.selectedMessageIds);
    const editingId = useChatRoomStore((s) => s.editingId);
    const toggleSelection = useChatRoomStore((s) => s.toggleSelection);

    if (!roomKey || !roomId) {
        return null;
    }

    return (
        <Box className={styles.messageArea}>
            <MessageList
                messages={messages}
                messagesLoading={isLoading}
                selectedMessageIds={selectedMessageIds}
                onToggleSelection={(id) =>
                    toggleSelection(id, messages, userId)
                }
                editingId={editingId}
                firstUnreadId={firstUnreadId}
                isFavoritesView={isFavoritesView}
                roomKey={roomKey}
                scrollRef={scrollRef}
            />
        </Box>
    );
}
