import { create } from "zustand";
import type { ChatType } from "@/lib/types";

export type ChatDialogType = ChatType | null;

interface ChatDialogsState {
    openDialog: ChatDialogType;
    setOpenDialog: (dialog: ChatDialogType) => void;
    closeDialogs: () => void;
}

/**
 * Глобальный стор для управления диалогами создания чатов и групп.
 * Необходим для устранения зависимости между фичами,
 * так как диалоги лежат в `chat`, а кнопка вызова в `navigation` или `admin`.
 */
export const useChatDialogs = create<ChatDialogsState>((set) => ({
    openDialog: null,
    setOpenDialog: (dialog) => set({ openDialog: dialog }),
    closeDialogs: () => set({ openDialog: null }),
}));
