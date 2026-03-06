import { useTypingIndicator } from "@/features/chat/message";
import { useChatPeer } from "@/features/chat/room/hooks/useChatPeer";
import { useChatRoomData } from "@/features/chat/room/hooks/useChatRoomData";
import { useAuthStore } from "@/stores/auth";
import { RoomHeader } from "../../../RoomHeader";
import { useChatRoomActions } from "../../hooks/useChatRoomActions";
import { useChatRoomView } from "../../hooks/useChatRoomView";
import { useChatRoomStore } from "../../store";

interface ChatRoomHeaderProps {
    /** ID комнаты — единственный необходимый prop после рефакторинга */
    roomId: string;
}

/**
 * Контейнер заголовка комнаты.
 *
 * После рефакторинга: автономный компонент, сам подключает все хуки.
 * Принимает только `roomId` вместо ранее передаваемых 14 props.
 */
export function ChatRoomHeader({ roomId }: ChatRoomHeaderProps) {
    const { user } = useAuthStore();

    // --- Данные комнаты и собеседника ---
    const { data: roomInfo } = useChatRoomData(roomId);
    const room = roomInfo?.room;
    const otherUserId = roomInfo?.otherUserId;
    const { data: peerUser } = useChatPeer(otherUserId, room?.type);

    // --- View-данные (для индикатора печати нужен displayName) ---
    const { typingUsers } = useTypingIndicator({
        roomId,
        displayName: peerUser?.display_name,
    });

    // --- Данные для отображения сообщений (нужны для onCopySelected и onEditSelected) ---
    const { messages } = useChatRoomView(roomId);

    // --- UI-состояние из стора ---
    const selectedCount = useChatRoomStore((s) => s.selectedMessageIds.size);
    const canEditSelected = useChatRoomStore((s) => s.canEditSelected);
    const clearSelection = useChatRoomStore((s) => s.clearSelection);
    const setEditingSelected = useChatRoomStore((s) => s.setEditingSelected);
    const setShowEndSessionDialog = useChatRoomStore(
        (s) => s.setShowEndSessionDialog,
    );
    const setShowDeleteConfirmDialog = useChatRoomStore(
        (s) => s.setShowDeleteConfirmDialog,
    );
    const setShowGroupInfoPanel = useChatRoomStore(
        (s) => s.setShowGroupInfoPanel,
    );

    // --- Бизнес-действия ---
    const { handleCopySelected, ending } = useChatRoomActions(roomId);

    return (
        <RoomHeader
            room={room}
            roomId={roomId}
            peerUser={peerUser}
            onEndSession={() => setShowEndSessionDialog(true)}
            ending={ending}
            selectedCount={selectedCount}
            canEditSelected={canEditSelected}
            onClearSelection={clearSelection}
            onDeleteSelected={() => setShowDeleteConfirmDialog(true)}
            onCopySelected={handleCopySelected}
            onReplySelected={() => console.log("Reply")}
            onForwardSelected={() => console.log("Forward")}
            onEditSelected={() => setEditingSelected(messages, user?.id)}
            typingUsers={typingUsers}
            onInfoClick={() => setShowGroupInfoPanel(true)}
        />
    );
}
