import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Хук для отслеживания активности пользователя.
 *
 * @param timeoutMs - Время неактивности (мс), после которого isActive станет false.
 * @returns { isActive, triggerActivity }
 */
export function useUserActivity(timeoutMs = 2000) {
    const [isActive, setIsActive] = useState(true);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerActivity = useCallback(() => {
        setIsActive(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsActive(false);
        }, timeoutMs);
    }, [timeoutMs]);

    useEffect(() => {
        const handleActivity = () => triggerActivity();

        // Подписка на глобальные события
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('keydown', handleActivity);

        triggerActivity(); // Инициализация при монтировании

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [triggerActivity]);

    return { isActive, triggerActivity };
}
