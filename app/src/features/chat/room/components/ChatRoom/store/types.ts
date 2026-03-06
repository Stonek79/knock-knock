import type { DecryptedMessageWithProfile } from "@/lib/types/message";

/**
 * Состояние комнаты чата (локальное).
 * Управляет выделением сообщений, режимом редактирования,
 * UI-состоянием диалогов и других клиентских состояний комнаты.
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

    // --- UI-состояние диалогов ---
    /** Открыт ли диалог завершения сессии */
    showEndSessionDialog: boolean;
    /** Открыт ли диалог подтверждения удаления */
    showDeleteConfirmDialog: boolean;
    /** Открыта ли панель информации о группе */
    showGroupInfoPanel: boolean;

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

    // --- Сеттеры диалогов ---
    /** Установить видимость диалога завершения сессии */
    setShowEndSessionDialog: (open: boolean) => void;
    /** Установить видимость диалога подтверждения удаления */
    setShowDeleteConfirmDialog: (open: boolean) => void;
    /** Установить видимость панели информации о группе */
    setShowGroupInfoPanel: (open: boolean) => void;
}

export type ChatRoomStore = ChatRoomState;
