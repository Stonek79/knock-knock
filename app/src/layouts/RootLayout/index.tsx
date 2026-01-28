import { Outlet, useLocation } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CallsList } from '@/features/calls/CallsList';
import { ChatList } from '@/features/chat/ChatList';
import { FavoritesList } from '@/features/favorites/FavoritesList';
import { SettingsSidebar } from '@/features/settings/SettingsSidebar';
import { useKeySync } from '@/hooks/useKeySync';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/useMediaQuery';
import { BottomNav } from '@/layouts/BottomNav';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { MobileHeader } from '@/layouts/MobileHeader';
import { IS_DEV, ROUTES } from '@/lib/constants';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import styles from './root.module.css';

/**
 * Корневой компонент приложения.
 * Отвечает за инициализацию auth и отображение:
 * - Mobile: MobileHeader + Content + BottomNav
 * - Desktop: Sidebar + Content
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
     * Определяем, нужно ли скрывать навигацию.
     * Скрываем на экранах:
     * - Логина
     * - Главной страницы (landing)
     * - Внутри комнаты чата (полноэкранный режим на мобильных)
     */
    const hideNav =
        location.pathname === ROUTES.LOGIN ||
        location.pathname === ROUTES.HOME ||
        (isMobile &&
            location.pathname.match(new RegExp(`^${ROUTES.CHAT_LIST}/[^/]+$`))); // /chat/:roomId только на мобильных

    /**
     * Определяем контент боковой панели на основе текущего роута.
     */
    const sidebarContent = useMemo(() => {
        const path = location.pathname;

        // Чаты — показываем список чатов
        if (path.startsWith(ROUTES.CHAT_LIST)) {
            return <ChatList />;
        }

        // Приватный чат — показываем список контактов для выбора
        if (path.startsWith(ROUTES.PRIVATE)) {
            // TODO: Заменить на PrivateContactList когда будет готов
            return null;
        }

        // Контакты
        if (path.startsWith(ROUTES.CONTACTS)) {
            // TODO: ContactList
            return null;
        }

        // Звонки
        if (path.startsWith(ROUTES.CALLS)) {
            return <CallsList />;
        }

        // Избранное
        if (path.startsWith(ROUTES.FAVORITES)) {
            return <FavoritesList />;
        }

        // Настройки
        if (path.startsWith(ROUTES.SETTINGS)) {
            return <SettingsSidebar />;
        }

        return null;
    }, [location.pathname]);

    const devModeBanner = !isSupabaseConfigured ? (
        <div className={styles.banner}>
            ⚠️ Dev Mode: Using Mock Backend (No persistence)
        </div>
    ) : null;

    if (loading) {
        return <div className={styles.loading}>{t('common.loading')}</div>;
    }

    // Гостевой режим (не авторизован) или скрытая навигация
    if (!user || hideNav) {
        return (
            <div className={styles.layout}>
                {devModeBanner}
                <Outlet />
                {IS_DEV && <TanStackRouterDevtools position="bottom-right" />}
            </div>
        );
    }

    // === MOBILE LAYOUT ===
    if (isMobile) {
        return (
            <div className={`${styles.layout} ${styles.mobileLayout}`}>
                {devModeBanner}
                <MobileHeader />
                <Outlet />
                <BottomNav />
                {IS_DEV && <TanStackRouterDevtools position="bottom-right" />}
            </div>
        );
    }

    // === DESKTOP LAYOUT ===
    return (
        <DesktopLayout sidebarContent={sidebarContent}>
            {devModeBanner}
            <Outlet />
            {IS_DEV && <TanStackRouterDevtools position="bottom-right" />}
        </DesktopLayout>
    );
}
