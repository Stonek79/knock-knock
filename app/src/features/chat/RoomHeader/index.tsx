import { useRouter } from '@tanstack/react-router';
import type { RoomWithMembers } from '@/lib/types/room';
import { DefaultHeader } from './DefaultHeader';
import { SelectionHeader } from './SelectionHeader';

interface PeerUser {
    id: string;
    display_name: string;
    username?: string;
    avatar_url?: string;
}

interface RoomHeaderProps {
    room?: RoomWithMembers;
    roomId: string;
    peerUser?: PeerUser | null;
    onEndSession?: () => void;
    ending?: boolean;
    selectedCount?: number;
    canEditSelected?: boolean;
    onClearSelection?: () => void;
    onDeleteSelected?: () => void;
    onCopySelected?: () => void;
    onReplySelected?: () => void;
    onForwardSelected?: () => void;
    onEditSelected?: () => void;
}

/**
 * Шапка комнаты чата.
 * Поддерживает режим "Action Bar" при выборе сообщений.
 */
export function RoomHeader({
    room,
    roomId,
    peerUser,
    onEndSession,
    ending,
    selectedCount = 0,
    canEditSelected = false,
    onClearSelection,
    onDeleteSelected,
    onCopySelected,
    onReplySelected,
    onForwardSelected,
    onEditSelected,
}: RoomHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        router.navigate({ to: '/chat' });
    };

    if (selectedCount > 0) {
        return (
            <SelectionHeader
                selectedCount={selectedCount}
                canEditSelected={canEditSelected}
                onClearSelection={onClearSelection}
                onDeleteSelected={onDeleteSelected}
                onCopySelected={onCopySelected}
                onReplySelected={onReplySelected}
                onForwardSelected={onForwardSelected}
                onEditSelected={onEditSelected}
            />
        );
    }

    return (
        <DefaultHeader
            room={room}
            roomId={roomId}
            peerUser={peerUser}
            onEndSession={onEndSession}
            ending={ending}
            onBack={handleBack}
        />
    );
}
