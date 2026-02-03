import { useState } from 'react';
import { ClipboardService } from '@/lib/services/clipboard';
import type { DecryptedMessageWithProfile } from '@/lib/types/message';

interface UseMessageSelectionProps {
    deleteMessage: (id: string, isOwnMessage: boolean) => Promise<void>;
    updateMessage: (id: string, text: string) => Promise<void>;
    user?: { id: string } | null;
    messages?: DecryptedMessageWithProfile[];
}

export function useMessageSelection({
    deleteMessage,
    updateMessage,
    messages = [],
    user,
}: UseMessageSelectionProps) {
    // Состояние выделенных сообщений
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
        new Set(),
    );

    // Состояние редактирования сообщения
    const [editingId, setEditingId] = useState<string | null>(null);

    const toggleSelection = (id: string) => {
        // Если уже редактируем, выделение не работает
        if (editingId) return;

        const newSet = new Set(selectedMessageIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedMessageIds(newSet);
    };

    const clearSelection = () => {
        setSelectedMessageIds(new Set());
    };

    const handleAction = async (action: () => Promise<void> | void) => {
        await action();
        clearSelection();
    };

    const handleDeleteSelected = () => {
        if (selectedMessageIds.size === 0) return;
        handleAction(async () => {
            const promises = Array.from(selectedMessageIds).map((id) => {
                const msg = messages.find((m) => m.id === id);
                const isOwn = msg?.sender_id === user?.id; // Determine ownership
                return deleteMessage(id, isOwn);
            });
            await Promise.allSettled(promises);
        });
    };

    const handleCopySelected = () => {
        handleAction(() => {
            const selectedText = messages
                .filter((m) => selectedMessageIds.has(m.id) && m.content)
                .map((m) => m.content)
                .join('\n\n');

            if (selectedText) {
                ClipboardService.copy(selectedText).catch(console.error);
            }
        });
    };

    const handleReplySelected = () => {
        handleAction(() => {
            console.log('Reply to:', Array.from(selectedMessageIds));
        });
    };

    const handleForwardSelected = () => {
        handleAction(() => {
            console.log('Forward:', Array.from(selectedMessageIds));
        });
    };

    const handleEditSelected = () => {
        if (selectedMessageIds.size !== 1) return;
        const id = Array.from(selectedMessageIds)[0];
        setEditingId(id);
        clearSelection();

        // Return content for the input
        const msg = messages.find((m) => m.id === id);
        return msg?.content;
    };

    const handleMessageUpdate = async (id: string, text: string) => {
        await updateMessage(id, text);
        setEditingId(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    // Derived content for editing
    const editingContent = editingId
        ? messages.find((m) => m.id === editingId)?.content
        : null;

    // Вычисляемое свойство: можно ли редактировать выбранное сообщение
    const selectedMsgId =
        selectedMessageIds.size === 1
            ? Array.from(selectedMessageIds)[0]
            : null;
    const selectedMsg = selectedMsgId
        ? messages.find((m) => m.id === selectedMsgId)
        : null;
    const canEditSelected =
        selectedMessageIds.size === 1 && selectedMsg?.sender_id === user?.id;

    return {
        selectedMessageIds,
        editingId,
        editingContent,
        canEditSelected,
        toggleSelection,
        clearSelection,
        handleDeleteSelected,
        handleCopySelected,
        handleReplySelected,
        handleForwardSelected,
        handleEditSelected,
        handleMessageUpdate,
        cancelEdit,
    };
}
