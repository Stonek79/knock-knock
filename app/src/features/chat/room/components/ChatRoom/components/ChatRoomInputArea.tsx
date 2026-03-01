import { MessageInput } from "@/features/chat/message";
import { useChatRoomStore } from "../store";

interface ChatRoomInputAreaProps {
    onSend: (text: string, files?: File[], audioBlob?: Blob) => Promise<void>;
    disabled: boolean;
    onTyping: (isTyping: boolean) => void;
}

/**
 * Зона ввода сообщений, интегрированная с локальным стором комнаты.
 */
export function ChatRoomInputArea({
    onSend,
    disabled,
    onTyping,
}: ChatRoomInputAreaProps) {
    const editingContent = useChatRoomStore((s) => s.editingContent);
    const cancelEdit = useChatRoomStore((s) => s.cancelEdit);
    const selectedCount = useChatRoomStore((s) => s.selectedMessageIds.size);

    return (
        <MessageInput
            onSend={onSend}
            onCancel={cancelEdit}
            disabled={disabled || selectedCount > 0}
            initialValue={editingContent || ""}
            onTyping={onTyping}
        />
    );
}
