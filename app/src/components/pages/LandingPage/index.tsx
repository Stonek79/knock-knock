import { Badge, Box, Button, Flex, Heading, Text } from '@radix-ui/themes';
import { useNavigate } from '@tanstack/react-router';
import { Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppLogo } from '@/components/ui/AppLogo';
import { ROUTES } from '@/lib/constants';
import styles from './landing.module.css';

/**
 * Главная страница (Лендинг).
 * Отображается для всех неавторизованных пользователей.
 * Сообщает о статусе разработки.
 */
export function LandingPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Flex
            className={styles.container}
            direction="column"
            align="center"
            justify="center"
        >
            <Flex
                direction="column"
                align="center"
                className={styles.content}
                gap="5"
            >
                <Badge color="orange" size="3" variant="surface" radius="full">
                    <Construction size={16} style={{ marginRight: '6px' }} />
                    {t('common.landing.badge')}
                </Badge>

                <AppLogo
                    width={280}
                    className={styles.logoImage}
                    updateFavicon
                />

                <Heading size="8" align="center" weight="medium">
                    {t('common.landing.title')}
                </Heading>

                <Text
                    size="5"
                    align="center"
                    color="gray"
                    style={{ maxWidth: 600, lineHeight: 1.6 }}
                >
                    {t('common.landing.description')}
                </Text>
            </Flex>

            <Box position="absolute" bottom="5">
                <Button
                    variant="ghost"
                    color="gray"
                    highContrast
                    onClick={() => navigate({ to: ROUTES.LOGIN })}
                    style={{ cursor: 'pointer' }}
                >
                    {t('common.landing.devLogin')}
                </Button>
            </Box>
        </Flex>
    );
}
