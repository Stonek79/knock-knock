import {
    Avatar,
    Badge,
    Box,
    Flex,
    Separator,
    Switch,
    Text,
} from '@radix-ui/themes';
import { Link } from '@tanstack/react-router';
import {
    Bell,
    ChevronRight,
    Globe,
    Lock,
    LogOut,
    Moon,
    Palette,
    User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_NAME, APP_VERSION, ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth';
import styles from './settingspage.module.css';

/**
 * Конфигурация элемента настроек.
 */
interface SettingItem {
    key: string;
    icon: React.ElementType;
    labelKey: string;
    defaultLabel: string;
    /** Ссылка на страницу или undefined для toggle-переключателей */
    link?: string;
    /** Для toggle-элементов */
    isToggle?: boolean;
}

/** Группа настроек */
interface SettingsGroup {
    titleKey: string;
    defaultTitle: string;
    items: SettingItem[];
}

/**
 * Страница настроек.
 * Предоставляет доступ к профилю, уведомлениям, теме и другим параметрам.
 */
export function SettingsPage() {
    const { t } = useTranslation();
    const { user, signOut } = useAuthStore();

    /** Конфигурация групп настроек */
    const settingsGroups: SettingsGroup[] = [
        {
            titleKey: 'settings.account',
            defaultTitle: 'Аккаунт',
            items: [
                {
                    key: 'profile',
                    icon: User,
                    labelKey: 'settings.profile',
                    defaultLabel: 'Профиль',
                    link: ROUTES.PROFILE,
                },
                {
                    key: 'privacy',
                    icon: Lock,
                    labelKey: 'settings.privacy',
                    defaultLabel: 'Конфиденциальность',
                },
            ],
        },
        {
            titleKey: 'settings.preferences',
            defaultTitle: 'Настройки',
            items: [
                {
                    key: 'notifications',
                    icon: Bell,
                    labelKey: 'settings.notifications',
                    defaultLabel: 'Уведомления',
                    isToggle: true,
                },
                {
                    key: 'darkMode',
                    icon: Moon,
                    labelKey: 'settings.darkMode',
                    defaultLabel: 'Тёмная тема',
                    isToggle: true,
                },
                {
                    key: 'language',
                    icon: Globe,
                    labelKey: 'settings.language',
                    defaultLabel: 'Язык',
                },
                {
                    key: 'theme',
                    icon: Palette,
                    labelKey: 'settings.theme',
                    defaultLabel: 'Тема',
                },
            ],
        },
    ];

    const handleSignOut = async () => {
        await signOut();
    };

    return (
        <Flex direction="column" flexGrow="1" p="4" gap="4">
            {/* Профиль пользователя */}
            <Link to={ROUTES.PROFILE} className={styles.link}>
                <Flex
                    align="center"
                    gap="3"
                    p="3"
                    className={styles.profileCard}
                >
                    <Avatar
                        size="5"
                        fallback={<User size={24} />}
                        radius="full"
                        color="blue"
                    />
                    <Box flexGrow="1">
                        <Text weight="bold" size="3">
                            {user?.email?.split('@')[0] ||
                                t('settings.user', 'Пользователь')}
                        </Text>
                        <Text color="gray" size="2">
                            {user?.email ||
                                t('settings.noEmail', 'Email не указан')}
                        </Text>
                    </Box>
                    <ChevronRight size={20} className={styles.chevron} />
                </Flex>
            </Link>

            {/* Группы настроек */}
            {settingsGroups.map((group) => (
                <Box key={group.titleKey}>
                    <Text size="2" color="gray" weight="medium" mb="2">
                        {t(group.titleKey, group.defaultTitle)}
                    </Text>
                    <Box className={styles.settingsGroup}>
                        {group.items.map((item, index) => {
                            const Icon = item.icon;
                            const content = (
                                <Flex
                                    key={item.key}
                                    align="center"
                                    gap="3"
                                    p="3"
                                    className={
                                        item.link
                                            ? styles.clickableItem
                                            : undefined
                                    }
                                >
                                    <Icon
                                        size={20}
                                        className={styles.itemIcon}
                                    />
                                    <Box flexGrow="1">
                                        <Text size="3">
                                            {t(
                                                item.labelKey,
                                                item.defaultLabel,
                                            )}
                                        </Text>
                                    </Box>
                                    {item.isToggle ? (
                                        <Switch size="2" />
                                    ) : item.link ? (
                                        <ChevronRight
                                            size={18}
                                            className={styles.chevron}
                                        />
                                    ) : (
                                        <Badge color="gray" variant="soft">
                                            {t('common.soon', 'Скоро')}
                                        </Badge>
                                    )}
                                </Flex>
                            );

                            return (
                                <Box key={item.key}>
                                    {item.link ? (
                                        <Link
                                            to={item.link}
                                            className={styles.link}
                                        >
                                            {content}
                                        </Link>
                                    ) : (
                                        content
                                    )}
                                    {index < group.items.length - 1 && (
                                        <Separator
                                            size="4"
                                            className={styles.separator}
                                        />
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            ))}

            {/* Кнопка выхода */}
            <Box onClick={handleSignOut} className={styles.signOutButton}>
                <Flex align="center" gap="3" p="3">
                    <LogOut size={20} className={styles.signOutIcon} />
                    <Text color="red" size="3" weight="medium">
                        {t('auth.signOut', 'Выйти')}
                    </Text>
                </Flex>
            </Box>

            {/* Версия приложения */}
            <Flex justify="center" mt="auto" pt="4">
                <Text color="gray" size="1">
                    {APP_NAME} v{APP_VERSION}
                </Text>
            </Flex>
        </Flex>
    );
}
