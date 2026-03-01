import type {
    MouseEvent as ReactMouseEvent,
    TouchEvent as ReactTouchEvent,
} from "react";
import { useCallback, useEffect, useRef } from "react";

interface LongPressOptions {
    /** Задержка до срабатывания длительного нажатия (мс). По умолчанию 500мс. */
    delay?: number;
}

/**
 * Хук для отслеживания долгого нажатия и обычного клика.
 * Возвращает обработчики событий, которые нужно привязать к элементу.
 */
export function useLongPress(
    onLongPress: () => void,
    onClick?: () => void,
    { delay = 500 }: LongPressOptions = {},
) {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const targetRef = useRef<EventTarget | null>(null);
    const isLongPressTriggered = useRef(false);

    const start = useCallback(
        (e: ReactTouchEvent | ReactMouseEvent) => {
            isLongPressTriggered.current = false;
            targetRef.current = e.target;
            timeoutRef.current = setTimeout(() => {
                isLongPressTriggered.current = true;
                onLongPress();
            }, delay);
        },
        [onLongPress, delay],
    );

    const clear = useCallback(
        (_e?: ReactTouchEvent | ReactMouseEvent, shouldTriggerClick = true) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (
                shouldTriggerClick &&
                !isLongPressTriggered.current &&
                onClick
            ) {
                onClick();
            }
            isLongPressTriggered.current = false;
            targetRef.current = null;
        },
        [onClick],
    );

    // Очищаем таймаут при размонтировании
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        onMouseDown: start,
        onTouchStart: start,
        onMouseUp: clear,
        onMouseLeave: () => clear(undefined, false),
        onTouchEnd: clear,
    };
}
