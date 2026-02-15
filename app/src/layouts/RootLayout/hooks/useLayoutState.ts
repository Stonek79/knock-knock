import { useLocation } from "@tanstack/react-router";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { ROUTES } from "@/lib/constants";

/**
 * Хук для управления состоянием лейаута.
 * Определяет мобильную версию и необходимость скрытия навигации.
 */
export function useLayoutState() {
    const location = useLocation();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    /**
     * Определяет, нужно ли скрывать основную навигацию (сайдбар/нижнее меню).
     */
    const shouldHideNav = () => {
        const path = location.pathname;

        // Базовые исключения
        if (([ROUTES.LOGIN, ROUTES.HOME] as string[]).includes(path)) {
            return true;
        }

        // Специфические правила для мобильных
        if (isMobile) {
            // Чат (\chat\room-id)
            const isChatRoom = new RegExp(`^${ROUTES.CHAT_LIST}/[^/]+$`).test(
                path,
            );

            return isChatRoom;
        }

        return false;
    };

    return {
        isMobile,
        hideNav: shouldHideNav(),
    };
}
