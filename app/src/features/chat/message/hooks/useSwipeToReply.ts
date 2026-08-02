import { useRef, useState } from "react";

interface UseSwipeToReplyProps {
    onReply?: () => void;
    disabled?: boolean;
}

export function useSwipeToReply({
    onReply,
    disabled = false,
}: UseSwipeToReplyProps) {
    const [swipeOffset, setSwipeOffset] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        if (disabled) {
            return;
        }

        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) {
            return;
        }

        if (disabled) {
            return;
        }

        const deltaX = e.touches[0].clientX - touchStartX.current;
        const deltaY = e.touches[0].clientY - touchStartY.current;

        // Определяем, что это именно горизонтальный свайп, а не вертикальный скролл
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            if (deltaX < 0) {
                // Разрешаем свайп только влево
                setSwipeOffset(Math.max(deltaX, -60)); // Ограничиваем максимальное натяжение
            }
        }
    };

    const onTouchEnd = () => {
        if (swipeOffset <= -40) {
            onReply?.();
            // Легкая вибрация, если поддерживается браузером
            if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(50);
            }
        }

        setSwipeOffset(0);
        touchStartX.current = null;
        touchStartY.current = null;
    };

    return {
        swipeOffset,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    };
}
