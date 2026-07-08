import { MessageCircle, Phone, Settings, Star } from "lucide-react";
import { NAVIGATION_KEYS, ROUTES } from "@/lib/constants";

/**
 * Конфигурация элемента навигации.
 */
export interface NavItemConfig {
    /** Уникальный ключ */
    key: string;
    /** Путь маршрута */
    path: string;
    /** Компонент иконки */
    icon: React.ElementType;
    /** Ключ локализации для лейбла */
    labelKey: string;
    /** Дефолтное значение лейбла */
    defaultLabel: string;
}

/** Конфигурация элементов навигации */
export const NAVIGATION_ITEMS: NavItemConfig[] = [
    {
        key: NAVIGATION_KEYS.CHATS,
        path: ROUTES.CHAT_LIST,
        icon: MessageCircle,
        labelKey: "nav.chats",
        defaultLabel: "Чаты",
    },
    {
        key: NAVIGATION_KEYS.FAVORITES,
        path: ROUTES.FAVORITES,
        icon: Star,
        labelKey: "nav.favorites",
        defaultLabel: "Избранное",
    },
    {
        key: NAVIGATION_KEYS.CALLS,
        path: ROUTES.CALLS,
        icon: Phone,
        labelKey: "nav.calls",
        defaultLabel: "Звонки",
    },
    {
        key: NAVIGATION_KEYS.SETTINGS,
        path: ROUTES.SETTINGS,
        icon: Settings,
        labelKey: "nav.settings",
        defaultLabel: "Настройки",
    },
];
