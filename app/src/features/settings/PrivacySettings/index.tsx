import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PrivacySettings() {
    const { t } = useTranslation();

    return (
        <Box p="4">
            <Flex align="center" gap="2" mb="4">
                <Lock size={24} />
                <Heading size="4">
                    {t('settings.privacy', 'Конфиденциальность')}
                </Heading>
            </Flex>
            <Text color="gray">
                {t(
                    'common.soon',
                    'Настройки конфиденциальности появятся скоро',
                )}
            </Text>
        </Box>
    );
}
