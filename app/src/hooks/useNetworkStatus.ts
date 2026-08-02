import { useEffect, useState } from "react";

import { NETWORK_EVENTS } from "@/lib/constants";

/**
 * Хук для отслеживания состояния подключения к сети.
 * Возвращает { isOnline: boolean }.
 */
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState<boolean>(() => {
        // Проверяем доступность navigator, на случай SSR (хоть у нас и SPA, но это хорошая практика)
        if (typeof navigator !== "undefined") {
            return navigator.onLine;
        }
        return true;
    });

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener(NETWORK_EVENTS.ONLINE, handleOnline);
        window.addEventListener(NETWORK_EVENTS.OFFLINE, handleOffline);

        return () => {
            window.removeEventListener(NETWORK_EVENTS.ONLINE, handleOnline);
            window.removeEventListener(NETWORK_EVENTS.OFFLINE, handleOffline);
        };
    }, []);

    return { isOnline };
}
