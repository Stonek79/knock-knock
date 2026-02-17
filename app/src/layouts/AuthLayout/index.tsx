import { Navigate } from "@tanstack/react-router";
import { MainLayoutSkeleton } from "@/components/Skeletons/Skeletons";
import { AppLayout } from "@/layouts/AppLayout";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";

/**
 * Layout для защищённых роутов.
 * Проверяет авторизацию и рендерит AppLayout (с сайдбаром), если пользователь авторизован.
 */
export function AuthLayout() {
    const { user, loading } = useAuthStore();

    if (loading) {
        return <MainLayoutSkeleton />;
    }

    if (!user) {
        return <Navigate to={ROUTES.LOGIN as string} />;
    }

    // Рендерим оболочку приложения
    return <AppLayout />;
}
