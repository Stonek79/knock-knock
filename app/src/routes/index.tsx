import { createFileRoute, Navigate } from '@tanstack/react-router';
import { LandingPage } from '@/components/pages/LandingPage';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth';

export const Route = createFileRoute('/')({
    component: Index,
});

function Index() {
    const { user, loading } = useAuthStore();

    // Если пользователь уже вошел, перенаправляем в список чатов
    if (!loading && user) {
        // Каст к строке нужен из-за особенностей типизации tanstack router vs наши константы
        return <Navigate to={ROUTES.CHAT_LIST as string} />;
    }

    return <LandingPage />;
}
