import { Card, Flex, Heading, Select, Text } from '@radix-ui/themes';
import { useTranslation } from 'react-i18next';
import { THEME } from '@/lib/constants/theme';
import type { ThemeValue } from '@/lib/types/theme';
import { useThemeStore } from '@/stores/theme';
import styles from './appearance.module.css';

export function AppearanceSettings() {
    const { t } = useTranslation();
    const { appearance, setAppearance } = useThemeStore();

    return (
        <Flex direction="column" gap="4" p="4" className={styles.container}>
            <Heading size="4" mb="2">
                {t('settings.appearance', 'Внешний вид')}
            </Heading>

            <Card size="2">
                <Flex direction="column" gap="4">
                    <Flex justify="between" align="center">
                        <Text>{t('profile.theme', 'Тема оформления')}</Text>
                        <Select.Root
                            value={appearance}
                            onValueChange={(value) =>
                                setAppearance(value as ThemeValue)
                            }
                        >
                            <Select.Trigger variant="surface" />
                            <Select.Content position="popper">
                                <Select.Item value={THEME.LIGHT}>
                                    {t('theme.light', 'Светлая')}
                                </Select.Item>
                                <Select.Item value={THEME.DARK}>
                                    {t('theme.dark', 'Темная')}
                                </Select.Item>
                                <Select.Item value={THEME.INHERIT}>
                                    {t('theme.system', 'Системная')}
                                </Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </Flex>
                </Flex>
            </Card>
        </Flex>
    );
}
