import { useLocation } from '@tanstack/react-router';
import { ROUTES } from '@/lib/constants';

/**
 * Хук для определения активного маршрута.
 * Проверяет, совпадает ли текущий путь с переданным или является ли его подпутем.
 */
export const useIsActive = () => {
    const location = useLocation();

    return (path: string): boolean => {
        if (path === ROUTES.CHAT_LIST) {
            // Для списка чатов проверяем, что мы находимся в корне списка или в конкретном чате,
            // но не в других разделах, которые могут начинаться похоже (если бы они были)
            return location.pathname.startsWith(ROUTES.CHAT_LIST);
        }
        // Для остальных маршрутов проверяем точное совпадение или вложенность
        return (
            location.pathname === path ||
            location.pathname.startsWith(`${path}/`)
        );
    };
};
