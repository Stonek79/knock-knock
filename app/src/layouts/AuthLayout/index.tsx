import { useQueryClient } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MainLayoutSkeleton } from "@/components/ui/Skeleton";
import { AppLayout } from "@/layouts/AppLayout";
import { ROUTES } from "@/lib/constants";
import { ChatRealtimeService } from "@/lib/services/chat-realtime";
import { useAuthStore } from "@/stores/auth";

/**
 * Layout для защищённых роутов.
 * Проверяет авторизацию и рендерит AppLayout (с сайдбаром), если пользователь авторизован.
 */
export function AuthLayout() {
    const pbUser = useAuthStore((state) => state.pbUser);
    const loading = useAuthStore((state) => state.loading);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (pbUser) {
            ChatRealtimeService.init({ qc: queryClient, user: pbUser });
        }
    }, [pbUser, queryClient]);

    if (loading) {
        return <MainLayoutSkeleton />;
    }

    if (!pbUser) {
        return <Navigate to={ROUTES.LOGIN as string} />;
    }

    // Рендерим оболочку приложения
    return <AppLayout />;
}
