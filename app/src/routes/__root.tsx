import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isSupabaseConfigured } from '@/lib/supabase';
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

    const devModeBanner = !isSupabaseConfigured ? (
        <div className={styles.banner}>
            ⚠️ Dev Mode: Using Mock Backend (No persistence)
        </div>
    ) : null;

    if (loading) {
        return <div className={styles.loading}>{t('common.loading')}</div>;
    }

    return (
        <div className={styles.layout}>
            {devModeBanner}
            <div className={styles.nav}>
                {/* Здесь будут ключевые элементы навигации */}
            </div>
            <Outlet />
            <TanStackRouterDevtools />
        </div>
    );
}
