import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { Link, useLocation } from '@tanstack/react-router';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { SETTINGS_ITEMS } from '@/config/settings';
import styles from './settingssidebar.module.css';

export function SettingsSidebar() {
    const { t } = useTranslation();
    const location = useLocation();

    return (
        <Box className={styles.sidebar}>
            <Box px="4" pt="4" mb="4">
                <Heading size="4">{t('nav.settings', 'Настройки')}</Heading>
            </Box>
            <Flex direction="column" gap="1">
                {SETTINGS_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <Link
                            key={item.key}
                            to={item.path}
                            className={clsx(
                                styles.desktopItem,
                                isActive && styles.active,
                            )}
                        >
                            <Flex align="center" gap="3">
                                <Icon size={18} />
                                <Text>
                                    {t(item.labelKey, item.defaultLabel)}
                                </Text>
                            </Flex>
                        </Link>
                    );
                })}
            </Flex>
        </Box>
    );
}
