import { Box } from "@radix-ui/themes";
import type { RefObject } from "react";
import { MessageList } from "@/features/chat/MessageList";
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
}: ChatRoomMessagesProps) {
    const selectedMessageIds = useChatRoomStore((s) => s.selectedMessageIds);
    const editingId = useChatRoomStore((s) => s.editingId);
    const toggleSelection = useChatRoomStore((s) => s.toggleSelection);

    if (!roomKey || !roomId) {
        return null;
    }

    return (
        <Box className={styles.messageArea} asChild>
            <main>
                <MessageList
                    messages={messages}
                    messagesLoading={isLoading}
                    selectedMessageIds={selectedMessageIds}
                    onToggleSelection={(id) =>
                        toggleSelection(id, messages, userId)
                    }
                    editingId={editingId}
                    scrollRef={scrollRef}
                    firstUnreadId={firstUnreadId}
                />
            </main>
        </Box>
    );
}
