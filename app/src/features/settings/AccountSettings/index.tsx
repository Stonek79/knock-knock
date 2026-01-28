import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth';
import styles from './accountsettings.module.css';

export function AccountSettings() {
    const { t } = useTranslation();
    const { user, signOut } = useAuthStore();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate({ to: ROUTES.LOGIN });
    };

    if (!user) return null;

    return (
        <Flex direction="column" gap="4" p="4" className={styles.container}>
            <Heading size="4" mb="2">
                {t('settings.account', 'Аккаунт')}
            </Heading>

            <Card className={styles.signOutCard}>
                <Flex justify="between" align="center">
                    <Text>
                        {t('common.email')}: {user.email}
                    </Text>
                    <Button variant="soft" color="red" onClick={handleSignOut}>
                        {t('common.signOut')}
                    </Button>
                </Flex>
            </Card>

            <ProfileForm />
        </Flex>
    );
}
