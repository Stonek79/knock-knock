import { Flex, Text } from '@radix-ui/themes';
import { useTranslation } from 'react-i18next';
import { SettingsMenu } from '@/features/settings/SettingsMenu';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/useMediaQuery';

export function SettingsIndexPage() {
    const { t } = useTranslation();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    if (isMobile) {
        return <SettingsMenu />;
    }

    return (
        <Flex align="center" justify="center" height="100%">
            <Text color="gray">
                {t('settings.selectItem', 'Выберите раздел настроек')}
            </Text>
        </Flex>
    );
}
