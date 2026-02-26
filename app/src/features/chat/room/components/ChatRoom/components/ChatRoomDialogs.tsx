import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { EndSessionDialog } from "./EndSessionDialog";

interface ChatRoomDialogsProps {
    showEndSession: boolean;
    onEndSessionChange: (open: boolean) => void;
    onEndSessionConfirm: () => Promise<void>;
    showDeleteConfirm: boolean;
    onDeleteConfirmChange: (open: boolean) => void;
    onDeleteConfirm: () => void;
}

/**
 * Группа диалоговых окон комнаты чата.
 */
export function ChatRoomDialogs({
    showEndSession,
    onEndSessionChange,
    onEndSessionConfirm,
    showDeleteConfirm,
    onDeleteConfirmChange,
    onDeleteConfirm,
}: ChatRoomDialogsProps) {
    return (
        <>
            <EndSessionDialog
                open={showEndSession}
                onOpenChange={onEndSessionChange}
                onConfirm={onEndSessionConfirm}
            />
            <DeleteConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={onDeleteConfirmChange}
                onConfirm={onDeleteConfirm}
            />
        </>
    );
}
