import { Outlet, useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Heading } from "@/components/ui/Heading";
import { MobileHeader, Navigation } from "@/features/navigation";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { APP_NAME, ROUTES } from "@/lib/constants";
import styles from "./applayout.module.css";
import { SidebarContent, shouldShowSidebar } from "./components/SidebarContent";

// Маппинг роутов на ключи перевода
const ROUTE_TITLE_KEYS: Record<string, string> = {
    [ROUTES.FAVORITES]: "favorites.title",
    [ROUTES.CALLS]: "calls.title",
    [ROUTES.CONTACTS]: "contacts.title",
    [ROUTES.SETTINGS]: "settings.title",
    [ROUTES.PROFILE]: "profile.title",
    [ROUTES.ADMIN]: "admin.title",
};

/**
 * AppLayout - Оболочка для авторизованной части приложения.
 * Использует Radix UI примитивы (Flex, Box) поверх CSS Modules.
 * Сохраняет существующую структуру верстки для стабильности, но заменяет div на Box/Flex.
 */
export function AppLayout() {
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);
    const location = useLocation();
    const showSidebarContent = shouldShowSidebar(location.pathname);
    const { t } = useTranslation();

    // Определение заголовка страницы
    const getPageTitle = useMemo(() => {
        const path = location.pathname;

        // Ищем точное совпадение или начало пути в маппинге
        const routeKey = Object.keys(ROUTE_TITLE_KEYS).find((route) =>
            path.startsWith(route),
        );

        if (routeKey) {
            const translationKey = ROUTE_TITLE_KEYS[routeKey];
            // Дефолтные значения для случаев, когда перевод еще не добавлен
            const defaults: Record<string, string> = {
                "favorites.title": "Избранное",
                "calls.title": "Звонки",
                "contacts.title": "Контакты",
                "settings.title": "Настройки",
                "profile.title": "Профиль",
                "admin.title": "Админка",
            };
            return t(translationKey, defaults[translationKey] || "");
        }

        return APP_NAME;
    }, [location.pathname, t]);

    // Проверка, является ли текущая страница чатом (там своя шапка)
    const isChatHeaderPage = useMemo(() => {
        const path = location.pathname;
        return (
            path.startsWith(ROUTES.CHAT_LIST) || // Любая страница чатов (список или комната)
            path.startsWith(ROUTES.FAVORITES)
        );
    }, [location.pathname]);

    // Логика скрытия навигации (только для мобильных чатов)
    const isChatRoomOpen = useMemo(() => {
        const path = location.pathname;
        // Если это чат/избранное И есть ID (длина пути > 2)
        return (
            (path.startsWith(ROUTES.CHAT_LIST) &&
                path.split(ROUTES.HOME).length > 2) ||
            (path.startsWith(ROUTES.FAVORITES) &&
                path.split(ROUTES.HOME).length > 2)
        );
    }, [location.pathname]);

    const hideMobileNav = useMemo(() => {
        return isMobile && isChatRoomOpen;
    }, [isMobile, isChatRoomOpen]);

    const hideMobileHeader = useMemo(() => {
        return isMobile && isChatHeaderPage; // Скрываем на всех страницах чата, т.к. там свои хедеры
    }, [isMobile, isChatHeaderPage]);

    return (
        <div id="app-container" className={styles.container}>
            {isMobile ? (
                /* === МОБИЛЬНЫЙ LAYOUT === */
                <Flex direction="column" className={styles.mobileLayout}>
                    {/* Заголовок (скрывается в чат-руме) */}
                    {!hideMobileHeader && (
                        <Box className={styles.mobileHeaderWrapper}>
                            <MobileHeader title={getPageTitle} />
                        </Box>
                    )}

                    {/* Контент страницы */}
                    <Box id="app-content" className={styles.mobileContent}>
                        <Outlet />
                    </Box>

                    {/* Навигация внизу (скрывается в чат-руме) */}
                    {!hideMobileNav && (
                        <Box className={styles.navigationWrapper}>
                            <Navigation />
                        </Box>
                    )}
                </Flex>
            ) : (
                /* === ДЕСКТОПНЫЙ LAYOUT === */
                <Flex className={styles.main}>
                    {/* Сайдбар */}
                    <Flex
                        direction="column"
                        id="app-sidebar"
                        className={styles.sidebar}
                    >
                        <Box className={styles.sidebarContent}>
                            <SidebarContent />
                        </Box>
                        <Box className={styles.navigationWrapper}>
                            <Navigation />
                        </Box>
                    </Flex>

                    {/* Контент страницы */}
                    <Box
                        id="app-content"
                        className={`${styles.content} ${!showSidebarContent ? styles.fullWidth : ""}`}
                    >
                        {/* Desktop Header for standard pages */}
                        {!isChatHeaderPage && (
                            <header className={styles.desktopHeader}>
                                <Heading size="xl">{getPageTitle}</Heading>
                            </header>
                        )}
                        <Outlet />
                    </Box>
                </Flex>
            )}
        </div>
    );
}
