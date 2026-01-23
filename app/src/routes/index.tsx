import { Box, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth';

export const Route = createFileRoute('/')({
    component: Index,
});

function Index() {
    const { t } = useTranslation();
    const { user, loading } = useAuthStore();

    // Если пользователь уже вошел, перенаправляем в список чатов (WhatsApp style)
    if (!loading && user) {
        return <Navigate to={ROUTES.CHAT_LIST as string} />;
    }

    return (
        <Flex
            direction="column"
            align="center"
            justify="center"
            flexGrow="1"
            p="6"
            gap="5"
            style={{ textAlign: 'center' }}
        >
            <Box mb="4">
                <Heading
                    size="9"
                    weight="bold"
                    style={{
                        background:
                            'linear-gradient(to right, var(--blue-9), var(--gray-12), var(--blue-9))',
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        color: 'var(--blue-9)',
                    }}
                >
                    {APP_NAME}
                </Heading>
                <Text
                    size="5"
                    color="gray"
                    style={{ maxWidth: 600, display: 'inline-block' }}
                >
                    {t('common.appDescription', {
                        defaultValue:
                            'Secure PWA Messenger with End-to-End Encryption.',
                    })}
                </Text>
            </Box>

            <Grid
                columns={{ initial: '1', md: '3' }}
                gap="5"
                width="100%"
                style={{ maxWidth: 1000 }}
            >
                <Card size="2">
                    <Heading size="3" mb="2">
                        {t('common.features.e2e.title')}
                    </Heading>
                    <Text as="p" color="gray">
                        {t('common.features.e2e.desc')}
                    </Text>
                </Card>
                <Card size="2">
                    <Heading size="3" mb="2">
                        {t('common.features.fast.title')}
                    </Heading>
                    <Text as="p" color="gray">
                        {t('common.features.fast.desc')}
                    </Text>
                </Card>
                <Card size="2">
                    <Heading size="3" mb="2">
                        {t('common.features.pwa.title')}
                    </Heading>
                    <Text as="p" color="gray">
                        {t('common.features.pwa.desc')}
                    </Text>
                </Card>
            </Grid>

            <Box mt="6">
                <Link to={ROUTES.LOGIN as string}>
                    <Button variant="solid" size="4" style={{ minWidth: 200 }}>
                        {t('auth.signIn')}
                    </Button>
                </Link>
            </Box>
        </Flex>
    );
}
