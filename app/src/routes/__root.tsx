import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import styles from './__root.module.css';
export const Route = createRootRoute({
    component: RootComponent,
});

function RootComponent() {
    const { t } = useTranslation();
    const { initialize, loading } = useAuthStore();

    useEffect(() => {
        initialize();
    }, [initialize]);

    if (loading) {
        return <div className={styles.loading}>{t('common.loading')}</div>;
    }

    return (
        <>
            <div className={styles.nav}>
                {/* Здесь будут ключевые элементы навигации */}
            </div>
            <Outlet />
            <TanStackRouterDevtools />
        </>
    );
}
