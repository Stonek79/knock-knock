import { useCallback, useRef, useState } from "react";

interface UseAudioRecordingParams {
    /** Начало записи (срабатывает после 400мс удержания) */
    onStartRecording: () => void | Promise<void>;
    /** Остановка записи с сохранением (когда отпустили кнопку) */
    onStopAndFinish: () => void;
    /** Отмена записи (когда увели курсор с кнопки) */
    onCancelRecording?: () => void;
}

interface UseAudioRecordingReturn {
    /** Обработчик нажатия на кнопку */
    onPointerDown: () => void;
    /** Обработчик отпускания кнопки */
    onPointerUp: () => void;
    /** Обработчик ухода курсора с кнопки */
    onPointerLeave: () => void;
    /** Обработчик системной отмены (например, скролл на мобилке) */
    onPointerCancel: () => void;
    /** Флаг: идёт ли запись */
    isRecording: boolean;
}

/**
 * Хук для записи аудио по долгому нажатию (Long Press).
 * Запись начинается мгновенно при касании (для обхода блокировок Safari).
 * Если отпустить быстрее чем через 400мс - запись отменяется.
 */
export function useAudioRecording({
    onStartRecording,
    onStopAndFinish,
    onCancelRecording,
}: UseAudioRecordingParams): UseAudioRecordingReturn {
    const [isRecording, setIsRecording] = useState(false);
    const isRecordingRef = useRef(false);
    const startTimeRef = useRef<number>(0);

    const handlePointerDown = useCallback(async () => {
        startTimeRef.current = Date.now();
        isRecordingRef.current = true;
        setIsRecording(true);

        onStartRecording();
    }, [onStartRecording]);

    const handlePointerUp = useCallback(() => {
        if (!isRecordingRef.current) {
            return;
        }

        const duration = Date.now() - startTimeRef.current;
        isRecordingRef.current = false;
        setIsRecording(false);

        if (duration < 400) {
            // Слишком быстрый тап — отменяем (защита от случайных кликов)
            onCancelRecording?.();
        } else {
            // Успешная запись
            onStopAndFinish();
        }
    }, [onStopAndFinish, onCancelRecording]);

    const handlePointerLeave = useCallback(() => {
        if (!isRecordingRef.current) {
            return;
        }

        // Увели палец с кнопки (Slide to cancel)
        isRecordingRef.current = false;
        setIsRecording(false);
        onCancelRecording?.();
    }, [onCancelRecording]);

    return {
        onPointerDown: handlePointerDown,
        onPointerUp: handlePointerUp,
        onPointerLeave: handlePointerLeave,
        onPointerCancel: handlePointerLeave,
        isRecording,
    };
}
