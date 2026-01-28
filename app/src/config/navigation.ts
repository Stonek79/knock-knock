import { MessageCircle, Phone, Settings, Star } from 'lucide-react';
import { ROUTES } from '@/lib/constants';

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

/** Конфигурация элементов навигации в стиле WhatsApp */
export const NAVIGATION_ITEMS: NavItemConfig[] = [
    {
        key: 'chats',
        path: ROUTES.CHAT_LIST,
        icon: MessageCircle,
        labelKey: 'nav.chats',
        defaultLabel: 'Чаты',
    },
    {
        key: 'favorites',
        path: ROUTES.FAVORITES,
        icon: Star,
        labelKey: 'nav.favorites',
        defaultLabel: 'Избранное',
    },
    {
        key: 'calls',
        path: ROUTES.CALLS,
        icon: Phone,
        labelKey: 'nav.calls',
        defaultLabel: 'Звонки',
    },
    {
        key: 'settings',
        path: ROUTES.SETTINGS,
        icon: Settings,
        labelKey: 'nav.settings',
        defaultLabel: 'Настройки',
    },
];
