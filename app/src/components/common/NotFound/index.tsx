import { Navigate } from "@tanstack/react-router";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";

/**
 * Компонент для обработки несуществующих маршрутов.
 * Вынесен из роутера для чистоты кода.
 */
export function NotFoundComponent() {
    const pbUser = useAuthStore((s) => s.pbUser);

    if (!pbUser) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    return <Navigate to={ROUTES.HOME} replace />;
}
