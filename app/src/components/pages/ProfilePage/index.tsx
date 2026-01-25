import { Card, Flex, Heading, Text } from '@radix-ui/themes';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { SecuritySettings } from '@/components/profile/SecuritySettings';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth';
import styles from './profile.module.css';

/**
 * Страница профиля пользователя.
 * Композиция компонентов: информация, форма редактирования, настройки безопасности.
 */
export function ProfilePage() {
    const { t } = useTranslation();
    const { user, signOut } = useAuthStore();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate({ to: ROUTES.LOGIN });
    };

    if (!user) {
        return (
            <div className={styles.profilePage}>
                <Card size="3" className={styles.signOutCard}>
                    <Flex direction="column" gap="4" align="center" py="6">
                        <Heading size="5" align="center">
                            {t('auth.pleaseLogIn')}
                        </Heading>
                        <Text color="gray" align="center">
                            {t(
                                'auth.signInToAccessProfile',
                                'Пожалуйста, войдите в систему, чтобы просмотреть свой профиль.',
                            )}
                        </Text>
                        <Link to={ROUTES.LOGIN}>
                            <Button size="3" variant="solid">
                                {t('auth.signIn', 'Войти')}
                            </Button>
                        </Link>
                    </Flex>
                </Card>
            </div>
        );
    }

    return (
        <div className={styles.profilePage}>
            <Flex align="center" mb="6">
                <Link to={ROUTES.CHAT_LIST} className={styles.backLink}>
                    <ArrowLeft size={20} />
                    <Text weight="medium">
                        {t('chat.back', 'Назад к чатам')}
                    </Text>
                </Link>
            </Flex>
            <Heading size="6" mb="4">
                {t('profile.title')}
            </Heading>

            <Card className={styles.signOutCard}>
                <div className={styles.infoFlex}>
                    <Text>
                        {t('common.email')}: {user.email}
                    </Text>
                    <Button variant="secondary" onClick={handleSignOut}>
                        {t('common.signOut')}
                    </Button>
                </div>
            </Card>

            <ProfileForm />
            <SecuritySettings />
        </div>
    );
}
