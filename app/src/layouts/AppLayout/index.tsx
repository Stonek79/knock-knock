import { Box, Flex } from "@radix-ui/themes";
import { Outlet, useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { MobileHeader } from "@/layouts/MobileHeader";
import { Navigation } from "@/layouts/RootLayout/components/Navigation";
import { useSidebarResolver } from "@/layouts/RootLayout/hooks/useSidebarResolver";
import styles from "@/layouts/RootLayout/root.module.css";
import { ROUTES } from "@/lib/constants";

/**
 * AppLayout - Оболочка для авторизованной части приложения.
 * Использует Radix UI примитивы (Flex, Box) поверх CSS Modules.
 * Сохраняет существующую структуру верстки для стабильности, но заменяет div на Box/Flex.
 */
export function AppLayout() {
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);
    const sidebarContent = useSidebarResolver();
    const location = useLocation();

    // Логика скрытия навигации (только для мобильных чатов)
    const hideNavInMobileChat = useMemo(() => {
        return (
            isMobile &&
            location.pathname.startsWith(ROUTES.CHAT_LIST) &&
            location.pathname.split("/").length > 2
        );
    }, [isMobile, location.pathname]);

    return (
        <div id="app-container" className={styles.container}>
            {isMobile ? (
                /* === МОБИЛЬНЫЙ LAYOUT === */
                <Flex direction="column" className={styles.mobileLayout}>
                    {/* Заголовок (скрывается в чат-руме) */}
                    {!hideNavInMobileChat && (
                        <Box className={styles.mobileHeaderWrapper}>
                            <MobileHeader />
                        </Box>
                    )}

                    {/* Контент страницы */}
                    <Box id="app-content" className={styles.mobileContent}>
                        <Outlet />
                    </Box>

                    {/* Навигация внизу (скрывается в чат-руме) */}
                    {!hideNavInMobileChat && (
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
                            {sidebarContent}
                        </Box>

                        <Box className={styles.navigationWrapper}>
                            <Navigation />
                        </Box>
                    </Flex>

                    {/* Контент страницы */}
                    <Box
                        id="app-content"
                        className={`${styles.content} ${!sidebarContent ? styles.fullWidth : ""}`}
                    >
                        <Outlet />
                    </Box>
                </Flex>
            )}
        </div>
    );
}
