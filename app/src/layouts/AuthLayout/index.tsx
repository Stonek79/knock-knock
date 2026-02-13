import { Navigate, Outlet } from "@tanstack/react-router";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";

/**
 * Layout для защищённых роутов.
 * Проверяет авторизацию и редиректит на /login если пользователь не авторизован.
 */
export function AuthLayout() {
    const { user, loading } = useAuthStore();

    if (loading) {
        return null; // или <Loader />
    }

    if (!user) {
        return <Navigate to={ROUTES.LOGIN as string} />;
    }

    return <Outlet />;
}
