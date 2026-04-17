import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import { useChatActions, useMessages } from "@/features/chat/message";
import { useChatRoomData } from "@/features/chat/room/hooks/useChatRoomData";
import { ClipboardService } from "@/lib/services/clipboard";
import { useAuthStore } from "@/stores/auth";
import { useChatRoomStore } from "../store";

/**
 * Хук бизнес-логики комнаты чата.
 *
 * Инкапсулирует:
 * - Отправку / редактирование сообщений
 * - Удаление выбранных сообщений
 * - Копирование текста выбранных сообщений
 * - Завершение сессии (endSession)
 *
 * Заменяет соответствующую логику из упразднённого god hook `useChatRoom`.
 *
 * @param roomId - ID комнаты чата
 */
export function useChatRoomActions(roomId: string) {
    const { t } = useTranslation();
    const toast = useToast();
    const user = useAuthStore((state) => state.profile);

    // --- Данные комнаты ---
    const { data: roomInfo } = useChatRoomData(roomId);
    const roomKey = roomInfo?.roomKey;
    const room = roomInfo?.room;

    // --- Текущие сообщения (нужны для копирования / удаления) ---
    const { data: messages = [] } = useMessages({ roomId, roomKey });

    // --- Низкоуровневые действия (отправка, удаление, завершение сессии) ---
    const { sendMessage, endSession, deleteMessage, updateMessage, ending } =
        useChatActions({ roomId, roomKey, user, room });

    // --- Состояния из стора ---
    const editingId = useChatRoomStore((s) => s.editingId);
    const cancelEdit = useChatRoomStore((s) => s.cancelEdit);
    const selectedMessageIds = useChatRoomStore((s) => s.selectedMessageIds);
    const clearSelection = useChatRoomStore((s) => s.clearSelection);
    const setShowDeleteConfirmDialog = useChatRoomStore(
        (s) => s.setShowDeleteConfirmDialog,
    );
    const setShowEndSessionDialog = useChatRoomStore(
        (s) => s.setShowEndSessionDialog,
    );

    /**
     * Обработчик отправки / редактирования сообщения.
     * Если активен режим редактирования — обновляет сообщение.
     * Иначе — отправляет новое.
     */
    const handleSend = async (
        text: string,
        files?: File[],
        audioBlob?: Blob,
    ) => {
        try {
            if (editingId) {
                await updateMessage({ messageId: editingId, newContent: text });
                cancelEdit();
            } else {
                await sendMessage({ text, files, audioBlob });
            }
        } catch (e) {
            toast({
                title: t("chat.sendError", "Ошибка отправки"),
                description:
                    e instanceof Error ? e.message : t("common.unknownError"),
                variant: "error",
            });
        }
    };

    /**
     * Удаляет все выделенные сообщения.
     * По завершении очищает выделение и закрывает диалог подтверждения.
     */
    const handleDeleteSelected = async () => {
        const promises = Array.from(selectedMessageIds).map((id) => {
            const msg = messages.find((m) => m.id === id);
            return deleteMessage({
                messageId: id,
                isOwnMessage: msg?.sender_id === user?.id,
            });
        });
        await Promise.allSettled(promises);
        clearSelection();
        setShowDeleteConfirmDialog(false);
    };

    /**
     * Копирует текст выделенных сообщений в буфер обмена.
     * После копирования сбрасывает выделение.
     */
    const handleCopySelected = () => {
        const selectedText = messages
            .filter((m) => selectedMessageIds.has(m.id) && m.content)
            .map((m) => m.content)
            .join("\n\n");

        if (selectedText) {
            ClipboardService.copy(selectedText);
        }
        clearSelection();
    };

    /**
     * Подтверждает завершение сессии и закрывает диалог.
     */
    const confirmEndSession = async () => {
        await endSession();
        setShowEndSessionDialog(false);
    };

    return {
        handleSend,
        handleDeleteSelected,
        handleCopySelected,
        confirmEndSession,
        ending,
    };
}
