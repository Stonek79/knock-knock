import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SecuritySettings() {
    const { t } = useTranslation();

    return (
        <Box p="4">
            <Flex align="center" gap="2" mb="4">
                <Shield size={24} />
                <Heading size="4">
                    {t('settings.security', 'Безопасность')}
                </Heading>
            </Flex>
            <Text color="gray">
                {t('common.soon', 'Настройки безопасности появятся скоро')}
            </Text>
        </Box>
    );
}
