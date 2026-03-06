import { Box } from "@/components/layout/Box";
import { MessageList } from "@/features/chat/message";
import type { DecryptedMessageWithProfile } from "@/lib/types/message";
import { useAuthStore } from "@/stores/auth";
import { useChatRoomData } from "../../../../hooks/useChatRoomData";
import { useChatRoomView } from "../../hooks/useChatRoomView";
import { useChatRoomStore } from "../../store";
import styles from "./chatroom-messages.module.css";

interface ChatRoomMessagesProps {
    /** ID комнаты — единственный необходимый prop после рефакторинга */
    roomId: string;
}

/**
 * Секция сообщений комнаты чата.
 *
 * После рефакторинга: автономный компонент, сам подключает все хуки.
 * Принимает только `roomId` вместо ранее передаваемых 8 props.
 */
export function ChatRoomMessages({ roomId }: ChatRoomMessagesProps) {
    const { user } = useAuthStore();

    // --- Данные комнаты (нужен roomKey для guard) ---
    const { data: roomInfo } = useChatRoomData(roomId);
    const roomKey = roomInfo?.roomKey;

    // --- View-данные (сообщения, скролл, режим) ---
    const {
        messages,
        messagesLoading,
        firstUnreadId,
        isFavoritesView,
        scrollRef,
    } = useChatRoomView(roomId);

    // --- UI-состояние из стора ---
    const selectedMessageIds = useChatRoomStore((s) => s.selectedMessageIds);
    const editingId = useChatRoomStore((s) => s.editingId);
    const toggleSelection = useChatRoomStore((s) => s.toggleSelection);

    if (!roomKey || !roomId) {
        return null;
    }

    return (
        <Box className={styles.messageArea}>
            <MessageList
                messages={messages as DecryptedMessageWithProfile[]}
                messagesLoading={messagesLoading}
                selectedMessageIds={selectedMessageIds}
                onToggleSelection={(id) =>
                    toggleSelection(
                        id,
                        messages as DecryptedMessageWithProfile[],
                        user?.id,
                    )
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
