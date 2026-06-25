import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/Text";
import { MessageInput, useTypingIndicator } from "@/features/chat/message";
import { ROOM_TYPE } from "@/lib/constants";
import { useChatRoomActions } from "../../../../hooks/useChatRoomActions";
import { useChatRoomData } from "../../../../hooks/useChatRoomData";
import { useChatRoomView } from "../../../../hooks/useChatRoomView";
import { useChatRoomStore } from "../../../../store";
import styles from "./chatroom-input-area.module.css";

interface ChatRoomInputAreaProps {
    /** ID комнаты */
    roomId: string;
}

/**
 * Зона ввода сообщений.
 * Оркестратор: получает состояния комнаты, выделения, цитирования и передает их в MessageInput.
 */
export function ChatRoomInputArea({ roomId }: ChatRoomInputAreaProps) {
    const { t } = useTranslation();

    // --- Данные комнаты (нужен roomKey для disabled-guard) ---
    const { data: roomInfo } = useChatRoomData(roomId);
    const roomKey = roomInfo?.roomKey;

    // --- Сообщения (нужны для поиска данных цитируемого сообщения) ---
    const { messages } = useChatRoomView(roomId);

    // --- Бизнес-действия ---
    const { handleSend } = useChatRoomActions(roomId);

    // --- Индикатор печати ---
    const { setTyping } = useTypingIndicator({ roomId });

    // --- UI-состояние из стора ---
    const editingContent = useChatRoomStore((s) => s.editingContent);
    const cancelEdit = useChatRoomStore((s) => s.cancelEdit);
    const selectedCount = useChatRoomStore((s) => s.selectedMessageIds.size);

    // --- Состояния Reply / Forward ---
    const replyingToId = useChatRoomStore((s) => s.replyingToId);
    const clearReplyingTo = useChatRoomStore((s) => s.clearReplyingTo);

    const forwardingMessageIds = useChatRoomStore(
        (s) => s.forwardingMessageIds,
    );
    const clearForwarding = useChatRoomStore((s) => s.clearForwarding);

    // --- Подготовка данных для превью цитаты ---
    const replyMessage = messages?.find((m) => m.id === replyingToId);
    const replyToData = replyMessage
        ? {
              id: replyMessage.id,
              senderName:
                  replyMessage.profiles?.display_name ||
                  t("chat.unknownUser", "Неизвестный"),
              content: replyMessage.content,
              attachments: replyMessage.attachments,
              isDeleted: replyMessage.is_deleted,
          }
        : null;

    const isSystemRoom = roomInfo?.room.type === ROOM_TYPE.SYSTEM;

    if (isSystemRoom) {
        return (
            <div className={`${styles.inputArea} ${styles.systemMessage}`}>
                <Text intent="secondary" size="sm">
                    {t("chat.systemChannelReadOnly")}
                </Text>
            </div>
        );
    }

    return (
        <div className={styles.inputArea}>
            <MessageInput
                onSend={handleSend}
                onCancel={cancelEdit}
                disabled={!roomKey || selectedCount > 0}
                initialValue={editingContent || ""}
                onTyping={setTyping}
                replyToData={replyToData}
                onClearReply={clearReplyingTo}
                forwardingCount={forwardingMessageIds.size}
                onClearForward={clearForwarding}
            />
        </div>
    );
}
