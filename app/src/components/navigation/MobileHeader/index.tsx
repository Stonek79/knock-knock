import { Box, DropdownMenu, Flex, Heading } from '@radix-ui/themes';
import { Link } from '@tanstack/react-router';
import {
    Camera,
    LogOut,
    MoreVertical,
    Search,
    Settings,
    Star,
    Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth';
import styles from './mobileheader.module.css';

/**
 * Пропсы компонента MobileHeader.
 */
interface MobileHeaderProps {
    /** Заголовок (по умолчанию название приложения) */
    title?: string;
    /** Показывать ли поиск */
    showSearch?: boolean;
    /** Показывать ли камеру */
    showCamera?: boolean;
    /** Показывать ли меню */
    showMenu?: boolean;
}

/**
 * Header для мобильной версии в стиле WhatsApp.
 * Отображает название приложения, иконки камеры, поиска и меню.
 */
export function MobileHeader({
    title = APP_NAME,
    showSearch = true,
    showCamera = true,
    showMenu = true,
}: MobileHeaderProps) {
    const { t } = useTranslation();
    const { signOut } = useAuthStore();

    return (
        <header className={styles.header}>
            <Heading size="6" weight="bold" className={styles.title}>
                {title}
            </Heading>

            <Flex gap="4" align="center">
                {showCamera && (
                    <Box className={styles.iconButton}>
                        <Camera size={22} />
                    </Box>
                )}
                {showSearch && (
                    <Box className={styles.iconButton}>
                        <Search size={22} />
                    </Box>
                )}
                {showMenu && (
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger>
                            <Box className={styles.iconButton}>
                                <MoreVertical size={22} />
                            </Box>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                            <DropdownMenu.Item>
                                <Users size={16} />
                                {t('chat.newGroup', 'Новая группа')}
                            </DropdownMenu.Item>

                            <DropdownMenu.Item asChild>
                                <Link to={ROUTES.FAVORITES}>
                                    <Flex gap="2" align="center">
                                        <Star size={16} />
                                        {t('nav.favorites', 'Избранное')}
                                    </Flex>
                                </Link>
                            </DropdownMenu.Item>

                            <DropdownMenu.Item asChild>
                                <Link to={ROUTES.SETTINGS}>
                                    <Flex gap="2" align="center">
                                        <Settings size={16} />
                                        {t('nav.settings', 'Настройки')}
                                    </Flex>
                                </Link>
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator />
                            <DropdownMenu.Item color="red" onClick={signOut}>
                                <LogOut size={16} />
                                {t('auth.signOut', 'Выйти')}
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                )}
            </Flex>
        </header>
    );
}
