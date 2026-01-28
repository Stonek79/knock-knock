import { Box, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SETTINGS_ITEMS } from '@/config/settings';
import styles from './settingsmenu.module.css';

/**
 * Меню настроек (для мобильной версии и главной страницы настроек).
 */
export function SettingsMenu() {
    const { t } = useTranslation();

    return (
        <Box className={styles.mobileContainer}>
            <Box px="4" pt="2" mb="4">
                <Heading size="5">{t('nav.settings', 'Настройки')}</Heading>
            </Box>
            <Flex direction="column" gap="2" px="4">
                {SETTINGS_ITEMS.map((item) => {
                    const Icon = item.icon;
                    // Формируем имя класса, например iconBlue, iconViolet
                    const colorClass =
                        styles[
                            `icon${item.color.charAt(0).toUpperCase() + item.color.slice(1)}`
                        ];

                    return (
                        <Link
                            key={item.key}
                            to={item.path}
                            className={styles.mobileItemLink}
                        >
                            <Card className={styles.mobileItem}>
                                <Flex justify="between" align="center">
                                    <Flex align="center" gap="3">
                                        <Box
                                            className={clsx(
                                                styles.iconBox,
                                                colorClass,
                                            )}
                                        >
                                            <Icon size={20} />
                                        </Box>
                                        <Text size="3" weight="medium">
                                            {t(
                                                item.labelKey,
                                                item.defaultLabel,
                                            )}
                                        </Text>
                                    </Flex>
                                    <ChevronRight color="gray" size={20} />
                                </Flex>
                            </Card>
                        </Link>
                    );
                })}
            </Flex>
        </Box>
    );
}
