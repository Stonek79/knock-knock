import { useRouter } from "@tanstack/react-router";
import type { PeerUser, RoomWithMembers } from "@/lib/types/room";
import { DefaultHeader } from "./DefaultHeader";
import { SelectionHeader } from "./SelectionHeader";

interface RoomHeaderProps {
    /** Данные комнаты */
    room?: RoomWithMembers;
    /** ID комнаты */
    roomId: string;
    /** Данные собеседника */
    peerUser?: PeerUser | null;
    /** Завершить сессию (только для эфемерных) */
    onEndSession?: () => void;
    /** Состояние завершения */
    ending?: boolean;
    /** Количество выбранных сообщений */
    selectedCount?: number;
    /** Можно ли редактировать выбранное сообщение */
    canEditSelected?: boolean;
    /** Сброс выбора */
    onClearSelection?: () => void;
    /** Удаление выбранных */
    onDeleteSelected?: () => void;
    /** Копирование текста сообщения */
    onCopySelected?: () => void;
    /** Ответ на сообщение */
    onReplySelected?: () => void;
    /** Пересылка сообщения */
    onForwardSelected?: () => void;
    /** Редактирование сообщения */
    onEditSelected?: () => void;
    /** Список печатающих пользователей */
    typingUsers?: string[];
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
    typingUsers,
}: RoomHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        router.navigate({ to: "/chat" });
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
            typingUsers={typingUsers}
        />
    );
}
