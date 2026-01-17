import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { SecuritySettings } from '@/components/profile/SecuritySettings';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth';
import styles from './profile.module.css';

export const Route = createFileRoute(ROUTES.PROFILE)({
    component: ProfilePage,
});

/**
 * Страница профиля пользователя.
 * Композиция компонентов: информация, форма редактирования, настройки безопасности.
 */
function ProfilePage() {
    const { t } = useTranslation();
    const { user, signOut } = useAuthStore();

    if (!user) {
        return <div>{t('auth.pleaseLogIn')}</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{t('profile.title')}</h1>

            <div className={styles.userInfo}>
                <p>
                    {t('common.email')}: {user.email}
                </p>
                <Button variant="secondary" onClick={() => signOut()}>
                    {t('common.signOut')}
                </Button>
            </div>

            <ProfileForm />
            <SecuritySettings />
        </div>
    );
}
