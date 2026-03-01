import { Navigate } from "@tanstack/react-router";
import { ROUTES } from "@/lib/constants";

/**
 * Страница профиля пользователя.
 * Композиция компонентов: информация, форма редактирования, настройки безопасности.
 */
export function ProfilePage() {
    return <Navigate to={ROUTES.SETTINGS_ACCOUNT} />;
}
