import { ChatList } from "@/features/chat/ChatList";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { ChatPlaceholder } from "./components/ChatPlaceholder";

/**
 * Индекс страницы /chat.
 * На десктопе: показывает заглушку «Выберите чат» (список в Sidebar).
 * На мобильных: показывает полноценный список чатов (Sidebar отсутствует).
 */
export function Chat() {
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    // На мобильных показываем список чатов (sidebar отсутствует)
    if (isMobile) {
        return <ChatList />;
    }

    // На десктопе показываем заглушку — список чатов в Sidebar
    return <ChatPlaceholder />;
}
