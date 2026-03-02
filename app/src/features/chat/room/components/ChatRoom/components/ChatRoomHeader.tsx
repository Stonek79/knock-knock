import type { DecryptedMessageWithProfile } from "@/lib/types/message";
import type { PeerUser, RoomWithMembers } from "@/lib/types/room";
import { RoomHeader } from "../../RoomHeader";
import { useChatRoomStore } from "../store";

interface ChatRoomHeaderProps {
    room?: RoomWithMembers;
    roomId: string;
    peerUser?: PeerUser | null;
    onEndSession: () => void;
    ending: boolean;
    onDeleteSelected: () => void;
    onCopySelected: (messages: DecryptedMessageWithProfile[]) => void;
    onReplySelected: () => void;
    onForwardSelected: () => void;
    messages: DecryptedMessageWithProfile[];
    userId?: string;
    typingUsers: string[];
    onInfoClick?: () => void;
}

/**
 * Контейнер для заголовка комнаты, связывающий его с локальным стором.
 */
export function ChatRoomHeader({
    room,
    roomId,
    peerUser,
    onEndSession,
    ending,
    onDeleteSelected,
    onCopySelected,
    onReplySelected,
    onForwardSelected,
    messages,
    userId,
    typingUsers,
    onInfoClick,
}: ChatRoomHeaderProps) {
    const selectedCount = useChatRoomStore((s) => s.selectedMessageIds.size);
    const canEditSelected = useChatRoomStore((s) => s.canEditSelected);
    const clearSelection = useChatRoomStore((s) => s.clearSelection);
    const setEditingSelected = useChatRoomStore((s) => s.setEditingSelected);

    return (
        <RoomHeader
            room={room}
            roomId={roomId}
            peerUser={peerUser}
            onEndSession={onEndSession}
            ending={ending}
            selectedCount={selectedCount}
            onClearSelection={clearSelection}
            onDeleteSelected={onDeleteSelected}
            onCopySelected={() => onCopySelected(messages)}
            onReplySelected={onReplySelected}
            onForwardSelected={onForwardSelected}
            onEditSelected={() => setEditingSelected(messages, userId)}
            canEditSelected={canEditSelected}
            typingUsers={typingUsers}
            onInfoClick={onInfoClick}
        />
    );
}
