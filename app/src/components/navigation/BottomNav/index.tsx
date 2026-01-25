import { Text } from '@radix-ui/themes';
import { Link, useLocation } from '@tanstack/react-router';
import clsx from 'clsx';
import { Lock, MessageCircle, Phone, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/lib/constants';
import styles from './bottomnav.module.css';

/**
 * Конфигурация элемента навигации.
 */
interface NavItemConfig {
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

/**
 * Пропсы компонента BottomNav.
 */
interface BottomNavProps {
    /** Количество непрочитанных сообщений (отображается как badge) */
    unreadCount?: number;
}

/**
 * Нижняя навигация для мобильных устройств в стиле WhatsApp.
 * Отображает четыре вкладки: Чаты, Приватный, Избранное, Звонки.
 * Включает активный индикатор-пилюлю и микро-анимации.
 *
 * @param props - Пропсы компонента
 * @returns JSX элемент нижней навигации
 */
export function BottomNav({ unreadCount = 0 }: BottomNavProps) {
    const { t } = useTranslation();
    const location = useLocation();

    /** Конфигурация элементов навигации в стиле WhatsApp */
    const navItems: NavItemConfig[] = [
        {
            key: 'chats',
            path: ROUTES.CHAT_LIST,
            icon: MessageCircle,
            labelKey: 'nav.chats',
            defaultLabel: 'Чаты',
        },
        {
            key: 'private',
            path: ROUTES.CONTACTS,
            icon: Lock,
            labelKey: 'nav.private',
            defaultLabel: 'Приватный',
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
    ];

    /**
     * Определяет, является ли маршрут активным.
     * Проверяет точное совпадение или начало пути.
     */
    const isActive = (path: string): boolean => {
        if (path === ROUTES.CHAT_LIST) {
            return location.pathname.startsWith(ROUTES.CHAT_LIST);
        }
        return (
            location.pathname === path ||
            location.pathname.startsWith(`${path}/`)
        );
    };

    return (
        <nav className={styles.bottomNav}>
            <ul className={styles.navList}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                        <li key={item.key}>
                            <Link
                                to={item.path}
                                className={clsx(
                                    styles.navItem,
                                    active && styles.navItemActive,
                                )}
                            >
                                <span
                                    className={clsx(
                                        styles.iconWrapper,
                                        active && styles.iconWrapperActive,
                                    )}
                                >
                                    <Icon
                                        size={24}
                                        strokeWidth={active ? 2.5 : 2}
                                    />
                                    {item.key === 'chats' &&
                                        unreadCount > 0 && (
                                            <span className={styles.badge}>
                                                {unreadCount > 99
                                                    ? '99+'
                                                    : unreadCount}
                                            </span>
                                        )}
                                </span>
                                <Text
                                    className={styles.label}
                                    weight={active ? 'medium' : 'regular'}
                                >
                                    {t(item.labelKey, item.defaultLabel)}
                                </Text>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
