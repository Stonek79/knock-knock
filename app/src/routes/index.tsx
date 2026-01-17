import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth';
import styles from './index.module.css';

export const Route = createFileRoute('/')({
    component: Index,
});

function Index() {
    const { t } = useTranslation();
    const { user, loading } = useAuthStore();

    // Если пользователь уже вошел, перенаправляем в Профиль (позже в чаты)
    if (!loading && user) {
        return <Navigate to={ROUTES.PROFILE as string} />;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{APP_NAME}</h1>
            <p className={styles.subtitle}>
                {t('common.appDescription', {
                    defaultValue:
                        'Secure PWA Messenger with End-to-End Encryption.',
                })}
            </p>

            <div className={styles.features}>
                <div className={styles.featureCard}>
                    <h3>{t('common.features.e2e.title')}</h3>
                    <p>{t('common.features.e2e.desc')}</p>
                </div>
                <div className={styles.featureCard}>
                    <h3>{t('common.features.fast.title')}</h3>
                    <p>{t('common.features.fast.desc')}</p>
                </div>
                <div className={styles.featureCard}>
                    <h3>{t('common.features.pwa.title')}</h3>
                    <p>{t('common.features.pwa.desc')}</p>
                </div>
            </div>

            <Link to={ROUTES.LOGIN as string}>
                <Button variant="primary" className={styles.ctaButton}>
                    {t('auth.signIn')}
                </Button>
            </Link>
        </div>
    );
}
