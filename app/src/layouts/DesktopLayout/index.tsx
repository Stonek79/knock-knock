import type { ReactNode } from "react";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { Sidebar } from "@/layouts/Sidebar";
import styles from "./desktoplayout.module.css";

/**
 * Пропсы компонента DesktopLayout.
 */
interface DesktopLayoutProps {
    /** Контент боковой панели (список чатов, контактов и т.д.) */
    sidebarContent: ReactNode;
    /** Основной контент (чат, детали и т.д.) */
    children: ReactNode;
}

/**
 * Универсальный лейаут для десктопной версии приложения.
 * Слева: Sidebar (Список + Навигация).
 * Справа: Основной контент.
 */
export function DesktopLayout({
    sidebarContent,
    children,
}: DesktopLayoutProps) {
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    // На мобильных устройствах показываем только основной контент
    if (isMobile) {
        return <>{children}</>;
    }

    return (
        <div className={styles.desktopLayout}>
            <div className={styles.backgroundLayer} />
            <div className={styles.sidebarColumn}>
                <Sidebar>{sidebarContent}</Sidebar>
            </div>
            <main className={styles.mainColumn}>{children}</main>
        </div>
    );
}
