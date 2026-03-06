import { MessageInput, useTypingIndicator } from "@/features/chat/message";
import { useChatRoomData } from "../../../../hooks/useChatRoomData";
import { useChatRoomActions } from "../../hooks/useChatRoomActions";
import { useChatRoomStore } from "../../store";
import styles from "./chatroom-input-area.module.css";

interface ChatRoomInputAreaProps {
    /** ID комнаты — единственный необходимый prop после рефакторинга */
    roomId: string;
}

/**
 * Зона ввода сообщений.
 *
 * Принимает только `roomId` вместо ранее передаваемых 3 props.
 */
export function ChatRoomInputArea({ roomId }: ChatRoomInputAreaProps) {
    // --- Данные комнаты (нужен roomKey для disabled-guard) ---
    const { data: roomInfo } = useChatRoomData(roomId);
    const roomKey = roomInfo?.roomKey;

    // --- Бизнес-действия ---
    const { handleSend } = useChatRoomActions(roomId);

    // --- Индикатор печати (только setTyping, typingUsers здесь не нужен) ---
    const { setTyping } = useTypingIndicator({ roomId });

    // --- UI-состояние из стора ---
    const editingContent = useChatRoomStore((s) => s.editingContent);
    const cancelEdit = useChatRoomStore((s) => s.cancelEdit);
    const selectedCount = useChatRoomStore((s) => s.selectedMessageIds.size);

    return (
        <div className={styles.inputArea}>
            <MessageInput
                onSend={handleSend}
                onCancel={cancelEdit}
                disabled={!roomKey || selectedCount > 0}
                initialValue={editingContent || ""}
                onTyping={setTyping}
            />
        </div>
    );
}
