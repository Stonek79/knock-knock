import { useLocation, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useMemo } from "react";
import { CallsList } from "@/features/calls/CallsList";
import { ChatList } from "@/features/chat/ChatList";
import { ContactList } from "@/features/contacts/ContactList";
import { SettingsSidebar } from "@/features/settings/SettingsSidebar";
import { ROUTES } from "@/lib/constants";

/**
 * Хук-резолвер для контента боковой панели.
 * Возвращает соответствующий компонент в зависимости от текущего маршрута.
 */
export function useSidebarResolver() {
    const location = useLocation();
    const navigate = useNavigate();

    return useMemo((): ReactNode => {
        const path = location.pathname;

        // Чаты или Избранное
        if (
            path.startsWith(ROUTES.CHAT_LIST) ||
            path.startsWith(ROUTES.FAVORITES)
        ) {
            return <ChatList />;
        }

        // Приватный чат
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
                    onSelect={(contact) => {
                        navigate({
                            to: "/dm/$userId",
                            params: { userId: contact.id },
                        });
                    }}
                />
            );
        }

        // Звонки
        if (path.startsWith(ROUTES.CALLS)) {
            return <CallsList />;
        }

        // Настройки и Админка
        if (path.startsWith(ROUTES.SETTINGS) || path.startsWith(ROUTES.ADMIN)) {
            return <SettingsSidebar />;
        }

        return null;
    }, [location.pathname, navigate]);
}
