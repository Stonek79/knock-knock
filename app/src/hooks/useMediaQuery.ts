import { useEffect, useState } from "react";

/**
 * Хук для определения соответствия CSS media query.
 * Используется для адаптивного переключения между desktop и mobile версиями.
 *
 * @param query - CSS media query строка (например, '(max-width: 768px)')
 * @returns boolean - соответствует ли текущий viewport переданному query
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(() => {
        // SSR проверка: на сервере window недоступен
        if (typeof window === "undefined") {
            return false;
        }
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);

        // Обработчик изменения media query
        const handleChange = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        // Устанавливаем начальное значение
        setMatches(mediaQuery.matches);

        // Современный API подписки
        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, [query]);

    return matches;
}

/** Предустановленные breakpoints для удобства */
export const BREAKPOINTS = {
    /** Мобильные устройства (до 768px) */
    MOBILE: "(max-width: 768px)",
    /** Планшеты (769px - 1024px) */
    TABLET: "(min-width: 769px) and (max-width: 1024px)",
    /** Десктоп (от 1025px) */
    DESKTOP: "(min-width: 1025px)",
} as const;
