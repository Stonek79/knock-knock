import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import { useChatActions } from "@/features/chat/hooks/useChatActions";
import { useChatPeer } from "@/features/chat/hooks/useChatPeer";
import { useChatRoomData } from "@/features/chat/hooks/useChatRoomData";
import { useMessages } from "@/features/chat/hooks/useMessages";
import { useTypingIndicator } from "@/features/chat/hooks/useTypingIndicator";
import { useUnreadTracking } from "@/features/chat/hooks/useUnreadTracking";
import { ClipboardService } from "@/lib/services/clipboard";
import { useAuthStore } from "@/stores/auth";
import { useChatRoomStore } from "../store";

/**
 * Агрегирующий хук для всей логики комнаты чата.
 * Содержит работу с данными, действия и управление состоянием.
 */
export function useChatRoom(roomId: string) {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const toast = useToast();

    // Инстанс стора для экшнов
    const editingId = useChatRoomStore((s) => s.editingId);
    const cancelEdit = useChatRoomStore((s) => s.cancelEdit);
    const selectedMessageIds = useChatRoomStore((s) => s.selectedMessageIds);
    const clearSelection = useChatRoomStore((s) => s.clearSelection);

    // Состояние диалогов
    const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
    const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] =
        useState(false);

    // Ref для скролла
    const scrollRef = useRef<{ scrollToBottom: () => void } | null>(null);

    // Загрузка данных
    const {
        data: roomInfo,
        isLoading: loading,
        error: fetchError,
    } = useChatRoomData(roomId);
    const room = roomInfo?.room;
    const roomKey = roomInfo?.roomKey;
    const otherUserId = roomInfo?.otherUserId;

    const { data: peerUser } = useChatPeer(otherUserId, room?.type);
    const { data: messages = [], isLoading: messagesLoading } = useMessages(
        roomId,
        roomKey,
    );

    // Индикатор печати
    const { typingUsers, setTyping } = useTypingIndicator({
        roomId,
        displayName: peerUser?.display_name,
    });

    // Действия
    const { sendMessage, endSession, deleteMessage, updateMessage, ending } =
        useChatActions({
            roomId,
            roomKey,
            user,
            room,
        });

    const { firstUnreadId, markAsRead } = useUnreadTracking(roomId, messages);

    useEffect(() => {
        return () => {
            markAsRead();
        };
    }, [markAsRead]);

    // Обработчики
    const handleSend = async (text: string) => {
        try {
            if (editingId) {
                await updateMessage(editingId, text);
                cancelEdit();
            } else {
                await sendMessage(text);
                markAsRead();
            }
            setTyping(false);
        } catch (e) {
            toast({
                title: t("chat.sendError", "Ошибка отправки"),
                description:
                    e instanceof Error ? e.message : t("common.unknownError"),
                variant: "error",
            });
        }
    };

    const handleDeleteSelected = async () => {
        const promises = Array.from(selectedMessageIds).map((id) => {
            const msg = messages.find((m) => m.id === id);
            return deleteMessage(id, msg?.sender_id === user?.id);
        });
        await Promise.allSettled(promises);
        clearSelection();
        setShowDeleteConfirmDialog(false);
    };

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

    return {
        t,
        user,
        room,
        roomId,
        roomKey,
        peerUser,
        messages,
        messagesLoading,
        loading,
        error: fetchError instanceof Error ? fetchError.message : null,
        typingUsers,
        setTyping,
        ending,
        firstUnreadId,
        scrollRef,
        // Dialogs
        showEndSessionDialog,
        setShowEndSessionDialog,
        showDeleteConfirmDialog,
        setShowDeleteConfirmDialog,
        // Handlers
        handleSend,
        handleDeleteSelected,
        handleCopySelected,
        confirmEndSession: async () => {
            await endSession();
            setShowEndSessionDialog(false);
        },
    };
}
