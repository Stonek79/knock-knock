import { Card, Flex, Heading, Select, Text } from '@radix-ui/themes';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/stores/theme';
import styles from './appearance.module.css';

export function AppearanceSettings() {
    const { t } = useTranslation();
    const { mode, setMode } = useThemeStore();

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
                            value={mode}
                            onValueChange={(value) =>
                                setMode(value as 'light' | 'dark')
                            }
                        >
                            <Select.Trigger variant="surface" />
                            <Select.Content position="popper">
                                <Select.Item value="light">
                                    {t('theme.light', 'Светлая')}
                                </Select.Item>
                                <Select.Item value="dark">
                                    {t('theme.dark', 'Темная')}
                                </Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </Flex>
                </Flex>
            </Card>
        </Flex>
    );
}
