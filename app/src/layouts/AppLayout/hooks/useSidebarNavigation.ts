import { useNavigate } from "@tanstack/react-router";
import { ROUTES } from "@/lib/constants";
import type { Profile } from "@/lib/types/profile";

/**
 * Хук для инкапсуляции бизнес-логики навигации из сайдбара.
 * Разгружает `SidebarContent` от детального знания роутов и параметров при кликах.
 */
export function useSidebarNavigation() {
    const navigate = useNavigate();

    const handlePrivateContactSelect = (contact: Profile) => {
        navigate({
            to: "/dm/$userId",
            params: { userId: contact.id },
            search: (prev) => ({ ...prev, isPrivate: true }),
        });
    };

    const handleNormalContactSelect = () => {
        navigate({
            to: ROUTES.PROFILE,
        });
    };

    return {
        handlePrivateContactSelect,
        handleNormalContactSelect,
    };
}
