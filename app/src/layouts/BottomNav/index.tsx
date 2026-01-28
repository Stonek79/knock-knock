import { Text } from '@radix-ui/themes';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { NAVIGATION_ITEMS } from '@/config/navigation';
import { useIsActive } from '@/hooks/useIsActive';
import styles from './bottomnav.module.css';

/**
 * Пропсы компонента BottomNav.
 */
interface BottomNavProps {
    /** Количество непрочитанных сообщений (отображается как badge) */
    unreadCount?: number;
    variant?: 'mobile' | 'desktop';
}

/**
 * Нижняя навигация для мобильных устройств в стиле WhatsApp.
 * Отображает четыре вкладки: Чаты, Приватный, Избранное, Звонки.
 * Включает активный индикатор-пилюлю и микро-анимации.
 *
 * @param props - Пропсы компонента
 * @returns JSX элемент нижней навигации
 */
export function BottomNav({
    unreadCount = 0,
    variant = 'mobile',
}: BottomNavProps) {
    const { t } = useTranslation();
    const checkIsActive = useIsActive();

    return (
        <nav
            className={clsx(
                styles.bottomNav,
                variant === 'mobile' && styles.fixedBottom,
            )}
        >
            <ul className={styles.navList}>
                {NAVIGATION_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = checkIsActive(item.path);

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
