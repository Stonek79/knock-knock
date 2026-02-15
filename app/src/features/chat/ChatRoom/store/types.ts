import type { DecryptedMessageWithProfile } from "@/lib/types/message";

/**
 * Состояние комнаты чата (локальное).
 * Управляет выделением сообщений, режимом редактирования и другими UI-состояниями комнаты.
 */
export interface ChatRoomState {
    /** Список ID выделенных сообщений */
    selectedMessageIds: Set<string>;
    /** ID редактируемого сообщения */
    editingId: string | null;
    /** Можно ли редактировать текущее выделенное сообщение */
    canEditSelected: boolean;
    /** Контент редактируемого сообщения */
    editingContent: string | null;

    // Действия
    /** Переключить выделение сообщения */
    toggleSelection: (
        id: string,
        messages: DecryptedMessageWithProfile[],
        userId?: string,
    ) => void;
    /** Очистить всё выделение */
    clearSelection: () => void;
    /** Начать редактирование выделенного сообщения */
    setEditingSelected: (
        messages: DecryptedMessageWithProfile[],
        userId?: string,
    ) => void;
    /** Отменить редактирование */
    cancelEdit: () => void;
    /** Проверить возможность редактирования выбранного */
    updateCanEdit: (
        messages: DecryptedMessageWithProfile[],
        userId?: string,
    ) => void;
}

export type ChatRoomStore = ChatRoomState;
