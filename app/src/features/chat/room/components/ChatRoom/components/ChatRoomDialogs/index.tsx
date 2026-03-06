import { useChatRoomActions } from "../../hooks/useChatRoomActions";
import { useChatRoomStore } from "../../store";
import { DeleteConfirmDialog } from "../DeleteConfirmDialog";
import { EndSessionDialog } from "../EndSessionDialog";

interface ChatRoomDialogsProps {
    /** ID комнаты — единственный необходимый prop после рефакторинга */
    roomId: string;
}

/**
 * Группа диалоговых окон комнаты чата.
 *
 * Автономный компонент, сам подключает стор и хук действий.
 * Принимает только `roomId` вместо ранее передаваемых 6 props.
 */
export function ChatRoomDialogs({ roomId }: ChatRoomDialogsProps) {
    // --- UI-состояние из стора ---
    const showEndSessionDialog = useChatRoomStore(
        (s) => s.showEndSessionDialog,
    );
    const showDeleteConfirmDialog = useChatRoomStore(
        (s) => s.showDeleteConfirmDialog,
    );
    const setShowEndSessionDialog = useChatRoomStore(
        (s) => s.setShowEndSessionDialog,
    );
    const setShowDeleteConfirmDialog = useChatRoomStore(
        (s) => s.setShowDeleteConfirmDialog,
    );

    // --- Обработчики из хука бизнес-логики ---
    const { confirmEndSession, handleDeleteSelected } =
        useChatRoomActions(roomId);

    return (
        <>
            <EndSessionDialog
                open={showEndSessionDialog}
                onOpenChange={setShowEndSessionDialog}
                onConfirm={confirmEndSession}
            />
            <DeleteConfirmDialog
                open={showDeleteConfirmDialog}
                onOpenChange={setShowDeleteConfirmDialog}
                onConfirm={handleDeleteSelected}
            />
        </>
    );
}
