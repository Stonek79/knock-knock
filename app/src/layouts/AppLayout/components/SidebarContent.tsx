import { useLocation } from "@tanstack/react-router";
import { CallsList } from "@/features/calls/CallsList";
import { ChatList, FavoritesChatList } from "@/features/chat/list";
import { ContactList } from "@/features/contacts/ContactList";
import { SettingsSidebar } from "@/features/settings/SettingsSidebar";
import { ROUTES } from "@/lib/constants";
import { useSidebarNavigation } from "../hooks/useSidebarNavigation";

/**
 * Проверяет, должен ли отображаться сайдбар на данном маршруте.
 */
export function shouldShowSidebar(path: string): boolean {
    return (
        path.startsWith(ROUTES.CHAT_LIST) ||
        path.startsWith(ROUTES.PRIVATE) ||
        path.startsWith(ROUTES.CONTACTS) ||
        path.startsWith(ROUTES.CALLS) ||
        path.startsWith(ROUTES.FAVORITES) ||
        path.startsWith(ROUTES.SETTINGS) ||
        path.startsWith(ROUTES.ADMIN)
    );
}

/**
 * SidebarContent - Компонент для отображения контента сайдбара на основе текущего роута.
 */
export function SidebarContent() {
    const location = useLocation();
    const { handlePrivateContactSelect, handleNormalContactSelect } =
        useSidebarNavigation();
    const path = location.pathname;

    // Чаты
    if (path.startsWith(ROUTES.CHAT_LIST)) {
        return <ChatList />;
    }

    // Выбор контакта (Private Chat)
    if (path.startsWith(ROUTES.PRIVATE)) {
        return (
            <ContactList mode="select" onSelect={handlePrivateContactSelect} />
        );
    }

    // Контакты
    if (path.startsWith(ROUTES.CONTACTS)) {
        return <ContactList mode="list" onSelect={handleNormalContactSelect} />;
    }

    // Звонки
    if (path.startsWith(ROUTES.CALLS)) {
        return <CallsList />;
    }

    // Избранное
    if (path.startsWith(ROUTES.FAVORITES)) {
        return <FavoritesChatList />;
    }

    // Настройки и Админка
    if (path.startsWith(ROUTES.SETTINGS) || path.startsWith(ROUTES.ADMIN)) {
        return <SettingsSidebar />;
    }

    return null;
}
