import { Navigate } from "@tanstack/react-router";
import { ROUTES } from "@/lib/constants";
import { LandingPage } from "@/pages/LandingPage";
import { useAuthStore } from "@/stores/auth";

export function IndexPage() {
    const { user, loading } = useAuthStore();

    // Если пользователь уже вошел, перенаправляем в список чатов
    if (!loading && user) {
        // Каст к строке нужен из-за особенностей типизации tanstack router vs наши константы
        return <Navigate to={ROUTES.CHAT_LIST as string} />;
    }

    return <LandingPage />;
}
