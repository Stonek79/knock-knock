import { useRef, useState } from "react";
import { useLongPress } from "@/hooks/useLongPress";

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
    onPointerDown: (e: React.PointerEvent) => void;
    /** Обработчик отпускания кнопки */
    onPointerUp: () => void;
    /** Обработчик ухода курсора с кнопки */
    onPointerLeave: () => void;
    /** Флаг: идёт ли запись */
    isRecording: boolean;
}

/**
 * Хук для записи аудио по долгому нажатию (Long Press).
 * Запись начинается только если держать кнопку >400мс.
 * Короткий клик игнорируется.
 */
export function useAudioRecording({
    onStartRecording,
    onStopAndFinish,
}: UseAudioRecordingParams): UseAudioRecordingReturn {
    const [isRecording, setIsRecording] = useState(false);
    const isRecordingRef = useRef(false);

    // Long Press для начала записи
    const { onPointerDown, onPointerUp: onPointerUpFromHook } = useLongPress(
        async () => {
            console.log("[useAudioRecording] onStartRecording called");
            // Long press сработал (>400мс) → начинаем запись
            isRecordingRef.current = true;
            setIsRecording(true);
            try {
                await onStartRecording();
                console.log(
                    "[useAudioRecording] recording started, isRecording:",
                    isRecordingRef.current,
                );
            } catch (error) {
                console.error(
                    "[useAudioRecording] startRecording failed:",
                    error,
                );
                isRecordingRef.current = false;
                setIsRecording(false);
            }
        },
        { delay: 400 },
    );

    return {
        onPointerDown,
        onPointerUp: async () => {
            console.log(
                "[useAudioRecording] onPointerUp, isRecording:",
                isRecordingRef.current,
            );
            // Сначала очищаем таймер из useLongPress
            onPointerUpFromHook();
            // Отпустили кнопку
            if (isRecordingRef.current) {
                isRecordingRef.current = false;
                setIsRecording(false);
                console.log("[useAudioRecording] onStopAndFinish called");
                await onStopAndFinish();
            } else {
                console.log("[useAudioRecording] ignored (<400ms)");
            }
            // Если отпустили <400мс → запись не началась, игнорируем
        },
        onPointerLeave: async () => {
            // НЕ отменяем запись при уходе курсора!
            // Курсор может сместиться во время удержания
            console.log(
                "[useAudioRecording] onPointerLeave - ignored (recording:",
                isRecordingRef.current,
                ")",
            );
        },
        isRecording,
    };
}
