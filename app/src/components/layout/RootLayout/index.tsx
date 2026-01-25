import { Outlet, useLocation } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomNav } from '@/components/navigation/BottomNav';
import { MobileHeader } from '@/components/navigation/MobileHeader';
import { useKeySync } from '@/hooks/useKeySync';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/useMediaQuery';
import { ROUTES } from '@/lib/constants';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import styles from './root.module.css';

/**
 * Корневой компонент приложения.
 * Отвечает за инициализацию auth, отображение навигации и основного контента.
 */
export function RootLayout() {
    const { t } = useTranslation();
    const { initialize, loading, user } = useAuthStore();
    const location = useLocation();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    // Автоматическая генерация и синхронизация ключей P2P
    useKeySync();

    useEffect(() => {
        initialize();
    }, [initialize]);

    /**
     * Определяем, нужно ли скрывать мобильную навигацию.
     * Скрываем на экранах:
     * - Логина
     * - Главной страницы (landing)
     * - Внутри комнаты чата (полноэкранный режим)
     */
    const hideMobileNav =
        location.pathname === ROUTES.LOGIN ||
        location.pathname === ROUTES.HOME ||
        location.pathname.match(/^\/chat\/[^/]+$/); // /chat/:roomId

    const devModeBanner = !isSupabaseConfigured ? (
        <div className={styles.banner}>
            ⚠️ Dev Mode: Using Mock Backend (No persistence)
        </div>
    ) : null;

    if (loading) {
        return <div className={styles.loading}>{t('common.loading')}</div>;
    }

    // Определяем класс layout в зависимости от устройства
    const layoutClass =
        isMobile && user && !hideMobileNav
            ? `${styles.layout} ${styles.mobileLayout}`
            : styles.layout;

    return (
        <div className={layoutClass}>
            {devModeBanner}

            {/* Mobile Header — показываем только авторизованным на мобильных */}
            {isMobile && user && !hideMobileNav && <MobileHeader />}

            <Outlet />

            {/* Мобильная навигация — показываем только авторизованным и на разрешенных экранах */}
            {isMobile && user && !hideMobileNav && <BottomNav />}

            <TanStackRouterDevtools />
        </div>
    );
}
