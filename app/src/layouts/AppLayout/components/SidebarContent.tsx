import { useLocation, useNavigate } from "@tanstack/react-router";
import { CallsList } from "@/features/calls/CallsList";
import { ChatList } from "@/features/chat/ChatList";
import { FavoritesChatList } from "@/features/chat/ChatList/FavoritesChatList";
import { ContactList } from "@/features/contacts/ContactList";
import { SettingsSidebar } from "@/features/settings/SettingsSidebar";
import { ROUTES } from "@/lib/constants";

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
    const navigate = useNavigate();
    const path = location.pathname;

    // Чаты
    if (path.startsWith(ROUTES.CHAT_LIST)) {
        return <ChatList />;
    }

    // Выбор контакта (Private Chat)
    // TODO: Это выглядит как логика фичи, возможно стоит вынести в отдельный роут или компонент
    if (path.startsWith(ROUTES.PRIVATE)) {
        return (
            <ContactList
                mode="select"
                onSelect={(contact) => {
                    navigate({
                        to: "/dm/$userId",
                        params: { userId: contact.id },
                        search: (prev) => ({ ...prev, isPrivate: true }),
                    });
                }}
            />
        );
    }

    // Контакты
    if (path.startsWith(ROUTES.CONTACTS)) {
        return (
            <ContactList
                mode="list"
                onSelect={() => {
                    navigate({
                        to: ROUTES.PROFILE,
                    });
                }}
            />
        );
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
