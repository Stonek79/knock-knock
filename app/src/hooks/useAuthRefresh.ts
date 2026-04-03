import { useEffect } from "react";
import { AuthService } from "@/lib/services/auth";
import { useAuthStore } from "@/stores/auth";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 минут

export const useAuthRefresh = () => {
    const fetchProfile = useAuthStore((state) => state.fetchProfile);

    useEffect(() => {
        // Проверка: если пользователь не авторизован, ничего не делаем
        if (!AuthService.isValid()) {
            return;
        }

        // 1. Интервальное обновление
        const interval = setInterval(() => {
            fetchProfile();
        }, REFRESH_INTERVAL_MS);

        // 2. Обновление при возврате на вкладку
        const handleVisibilityChange = () => {
            if (
                document.visibilityState === "visible" &&
                AuthService.isValid()
            ) {
                fetchProfile();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // 3. Очистка (Cleanup) — предотвращает утечки памяти
        return () => {
            clearInterval(interval);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    }, [fetchProfile]);
};
