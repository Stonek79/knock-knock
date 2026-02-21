import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import { ToastProvider } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/auth";
import styles from "./root.module.css";

/**
 * Корневой лейаут приложения.
 * Отвечает ТОЛЬКО за глобальные провайдеры и инициализацию.
 * Визуальная оболочка (Sidebar/Nav) вынесена в AppLayout.
 */
export function RootLayout() {
    const { loading: authLoading, initialize } = useAuthStore();

    // Инициализация авторизации при первом рендере
    useEffect(() => {
        initialize();
    }, [initialize]);

    // Состояние загрузки (премиальный лоадер)
    if (authLoading) {
        return <GlobalLoader />;
    }

    return (
        <ToastProvider>
            <div id="root-container" className={styles.container}>
                <Outlet />
            </div>
        </ToastProvider>
    );
}
