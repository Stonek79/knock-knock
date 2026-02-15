import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { GlobalLoader } from "@/components/ui/Loading/GlobalLoader";
import { ToastProvider } from "@/components/ui/Toast";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { useAuthStore } from "@/stores/auth";
import { MobileHeader } from "../MobileHeader";
import { Navigation } from "./components/Navigation";
import { useLayoutState } from "./hooks/useLayoutState";
import { useSidebarResolver } from "./hooks/useSidebarResolver";
import styles from "./root.module.css";

/**
 * Корневой лейаут приложения.
 * Theme-обёртка находится в main.tsx (единственный Theme на проект).
 *
 * Архитектура:
 * - Desktop: Sidebar (контент + навигация) | Content (Outlet)
 * - Mobile: MobileHeader → Outlet → Navigation (без sidebar)
 */
export function RootLayout() {
    const { loading: authLoading, initialize } = useAuthStore();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    // Инициализация авторизации при первом рендере
    useEffect(() => {
        initialize();
    }, [initialize]);

    // Декомпозированная логика лейаута
    const { hideNav } = useLayoutState();
    const sidebarContent = useSidebarResolver();

    // Состояние загрузки (премиальный лоадер)
    if (authLoading) {
        return <GlobalLoader />;
    }

    return (
        <ToastProvider>
            <div id="root-container" className={styles.container}>
                {isMobile ? (
                    /* === МОБИЛЬНЫЙ LAYOUT === */
                    <div className={styles.mobileLayout}>
                        {/* Заголовок (скрывается в чат-руме) */}
                        {!hideNav && (
                            <div className={styles.mobileHeaderWrapper}>
                                <MobileHeader />
                            </div>
                        )}

                        {/* Контент страницы (pending/error управляется TanStack Router) */}
                        <section
                            id="root-content"
                            className={styles.mobileContent}
                        >
                            <Outlet />
                        </section>

                        {/* Навигация внизу (скрывается в чат-руме) */}
                        {!hideNav && (
                            <div className={styles.navigationWrapper}>
                                <Navigation />
                            </div>
                        )}
                    </div>
                ) : (
                    /* === ДЕСКТОПНЫЙ LAYOUT === */
                    <main className={styles.main}>
                        {/* Сайдбар (боковая панель контента + навигация) */}
                        <aside id="root-sidebar" className={styles.sidebar}>
                            <div className={styles.sidebarContent}>
                                {sidebarContent}
                            </div>

                            <div className={styles.navigationWrapper}>
                                <Navigation />
                            </div>
                        </aside>

                        {/* Контент страницы (pending/error управляется TanStack Router) */}
                        <section
                            id="root-content"
                            className={`${styles.content} ${!sidebarContent ? styles.fullWidth : ""}`}
                        >
                            <Outlet />
                        </section>
                    </main>
                )}
            </div>
        </ToastProvider>
    );
}
