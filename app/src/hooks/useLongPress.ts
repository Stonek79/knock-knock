import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef } from "react";

interface LongPressOptions {
    /** Задержка до срабатывания длительного нажатия (мс). По умолчанию 500мс. */
    delay?: number;
}

/**
 * Хук для отслеживания долгого нажатия.
 * Использует Pointer Events API для единой обработки мыши, тача и пера.
 * Вызывает onLongPress только если нажатие длилось > delay мс.
 * Возвращает обработчики событий, которые нужно привязать к элементу.
 */
export function useLongPress(
    onLongPress: () => void,
    { delay = 500 }: LongPressOptions = {},
) {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const targetRef = useRef<EventTarget | null>(null);
    const isLongPressTriggered = useRef(false);

    const start = useCallback(
        (e: ReactPointerEvent) => {
            // Разрешаем только первичные нажатия (левая кнопка мыши или касание)
            if (e.button !== 0) {
                return;
            }
            console.log("[useLongPress] start - timer set for", delay, "ms");
            isLongPressTriggered.current = false;
            targetRef.current = e.target;
            timeoutRef.current = setTimeout(() => {
                console.log("[useLongPress] LONG PRESS triggered!");
                isLongPressTriggered.current = true;
                onLongPress();
            }, delay);
        },
        [onLongPress, delay],
    );

    const clear = useCallback((_e?: ReactPointerEvent) => {
        console.log(
            "[useLongPress] clear - timeout:",
            timeoutRef.current ? "cleared" : "none",
        );
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        // onClick больше не вызывается — только long press
        isLongPressTriggered.current = false;
        targetRef.current = null;
    }, []);

    // Очищаем таймаут при размонтировании
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        onPointerDown: start,
        onPointerUp: clear,
        onPointerLeave: () => clear(undefined),
    };
}
