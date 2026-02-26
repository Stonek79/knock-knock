import { createStore } from "zustand";
import type { ChatRoomStore } from "./types";

/**
 * Создает экземпляр локального стора для комнаты чата.
 * Использование createStore (без хука) позволяет передавать стор через Context.
 */
export const createChatRoomStore = () => {
    return createStore<ChatRoomStore>((set, get) => ({
        selectedMessageIds: new Set(),
        editingId: null,
        canEditSelected: false,
        editingContent: null,

        toggleSelection: (id, messages, userId) => {
            const { editingId, selectedMessageIds } = get();
            if (editingId) {
                return;
            }

            const newSet = new Set(selectedMessageIds);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }

            set({ selectedMessageIds: newSet });
            get().updateCanEdit(messages, userId);
        },

        clearSelection: () => {
            set({ selectedMessageIds: new Set(), canEditSelected: false });
        },

        setEditingSelected: (messages, userId) => {
            const { selectedMessageIds } = get();
            if (selectedMessageIds.size !== 1) {
                return;
            }

            const id = Array.from(selectedMessageIds)[0];
            const msg = messages.find((m) => m.id === id);

            if (msg && msg.sender_id === userId) {
                set({
                    editingId: id,
                    editingContent: msg.content,
                    selectedMessageIds: new Set(),
                    canEditSelected: false,
                });
            }
        },

        cancelEdit: () => {
            set({ editingId: null, editingContent: null });
        },

        updateCanEdit: (messages, userId) => {
            const { selectedMessageIds } = get();
            if (selectedMessageIds.size !== 1) {
                set({ canEditSelected: false });
                return;
            }

            const id = Array.from(selectedMessageIds)[0];
            const msg = messages.find((m) => m.id === id);
            const canEdit = msg?.sender_id === userId;

            set({ canEditSelected: !!canEdit });
        },
    }));
};
