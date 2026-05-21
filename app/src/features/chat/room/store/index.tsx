import { createContext, type ReactNode, useContext, useRef } from "react";
import { useStore } from "zustand";
import { createChatRoomStore } from "./createStore";
import type { ChatRoomStore } from "./types";

/** Тип инстанса стора */
type ChatRoomStoreApi = ReturnType<typeof createChatRoomStore>;

/** Контекст для передачи стора вниз по дереву компонентов комнаты */
const ChatRoomContext = createContext<ChatRoomStoreApi | undefined>(undefined);

interface ChatRoomProviderProps {
    children: ReactNode;
}

/**
 * Провайдер локального состояния комнаты чата.
 * Гарантирует, что у каждого экземпляра ChatRoom свой независимый стейт.
 */
export function ChatRoomProvider({ children }: ChatRoomProviderProps) {
    const storeRef = useRef<ChatRoomStoreApi>(null);
    if (!storeRef.current) {
        storeRef.current = createChatRoomStore();
    }

    return (
        <ChatRoomContext.Provider value={storeRef.current}>
            {children}
        </ChatRoomContext.Provider>
    );
}

/**
 * Хук для использования состояния комнаты чата.
 * Поддерживает селекторы для оптимизации рендеров.
 *
 * @example
 * const selectedCount = useChatRoomStore(s => s.selectedMessageIds.size);
 */
export function useChatRoomStore<T>(selector: (store: ChatRoomStore) => T): T {
    const context = useContext(ChatRoomContext);
    if (!context) {
        throw new Error(
            "useChatRoomStore must be used within ChatRoomProvider",
        );
    }
    return useStore(context, selector);
}
