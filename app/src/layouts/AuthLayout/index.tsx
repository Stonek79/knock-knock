import { Navigate } from "@tanstack/react-router";
import { MainLayoutSkeleton } from "@/components/ui/Skeleton";
import { AppLayout } from "@/layouts/AppLayout";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";

/**
 * Layout для защищённых роутов.
 * Проверяет авторизацию и рендерит AppLayout (с сайдбаром), если пользователь авторизован.
 */
export function AuthLayout() {
    const pbUser = useAuthStore((state) => state.pbUser);
    const loading = useAuthStore((state) => state.loading);

    if (loading) {
        return <MainLayoutSkeleton />;
    }

    if (!pbUser) {
        return <Navigate to={ROUTES.LOGIN as string} />;
    }

    // Рендерим оболочку приложения
    return <AppLayout />;
}
