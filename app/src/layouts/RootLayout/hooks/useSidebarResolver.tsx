import { useLocation, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useMemo } from "react";
import { CallsList } from "@/features/calls/CallsList";
import { ChatList } from "@/features/chat/ChatList";
import { FavoritesChatList } from "@/features/chat/ChatList/FavoritesChatList";
import { ContactList } from "@/features/contacts/ContactList";
import { SettingsSidebar } from "@/features/settings/SettingsSidebar";
import { ROUTES } from "@/lib/constants";

/**
 * useSidebarResolver - Хук для определения контента сайдбара на основе текущего роута.
 */
export function useSidebarResolver(): ReactNode {
    const location = useLocation();
    const navigate = useNavigate();

    return useMemo((): ReactNode => {
        const path = location.pathname;

        // Чаты
        if (path.startsWith(ROUTES.CHAT_LIST)) {
            return <ChatList />;
        }

        // Выбор контакта (Private Chat)
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
    }, [location.pathname, navigate]);
}
