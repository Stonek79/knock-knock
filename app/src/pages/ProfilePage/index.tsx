import { Navigate } from '@tanstack/react-router';

/**
 * Страница профиля пользователя.
 * Композиция компонентов: информация, форма редактирования, настройки безопасности.
 */
export function ProfilePage() {
    return <Navigate to="/settings/account" />;
}
