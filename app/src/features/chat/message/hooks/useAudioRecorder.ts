import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_MIME_TYPES, RECORDING_LIMITS } from "@/lib/constants/storage";
import { useSpeechRecognition } from "./useSpeechRecognition";

const RECORDER_STATE = {
    INACTIVE: "inactive",
    RECORDING: "recording",
    PAUSED: "paused",
} as const;

interface UseAudioRecorderProps {
    disabled?: boolean;
    sending?: boolean;
    onRecordingComplete: (transcript: string, audioBlob: Blob) => void;
}

/**
 * Хук для записи голосовых сообщений.
 */
export function useAudioRecorder({
    disabled,
    sending,
    onRecordingComplete,
}: UseAudioRecorderProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const {
        getTranscript,
        startRecognition,
        stopRecognition,
        resetTranscript,
    } = useSpeechRecognition();

    const stopAndFinishRecording = useCallback(() => {
        if (!isRecording || !mediaRecorderRef.current) {
            return;
        }

        // Предотвращаем повторый вызов stop
        if (mediaRecorderRef.current.state === RECORDER_STATE.INACTIVE) {
            return;
        }

        mediaRecorderRef.current.onstop = () => {
            // Остановка треков
            const tracks = mediaRecorderRef.current?.stream.getTracks() || [];
            for (let i = 0; i < tracks.length; i++) {
                tracks[i].stop();
            }

            const audioBlob = new Blob(audioChunksRef.current, {
                type: DEFAULT_MIME_TYPES.WEBM_AUDIO,
            });

            if (audioBlob.size > 0) {
                const finalTranscript = getTranscript().trim();
                onRecordingComplete(finalTranscript, audioBlob);
            }
            audioChunksRef.current = [];
        };

        // Задержка перед остановкой для захвата хвоста речи
        setTimeout(() => {
            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !== RECORDER_STATE.INACTIVE
            ) {
                mediaRecorderRef.current.stop();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            stopRecognition();
            setIsRecording(false);
            setRecordingTime(0);
        }, RECORDING_LIMITS.STOP_DELAY_MS);
    }, [isRecording, onRecordingComplete, getTranscript, stopRecognition]);

    const startRecording = async () => {
        if (disabled || sending) {
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            // Запускаем с timeslice для периодического сбора данных
            mediaRecorder.start(RECORDING_LIMITS.DATA_TIMESLICE_MS);
            setIsRecording(true);
            setRecordingTime(0);
            resetTranscript();

            // Начинаем распознавание речи только после того, как получен доступ к микрофону
            startRecognition();

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => {
                    // Останавливаем, если достигнут максимальный лимит включительно
                    if (prev >= RECORDING_LIMITS.MAX_DURATION_SECONDS - 1) {
                        stopAndFinishRecording();
                        return 0;
                    }
                    return prev + 1;
                });
            }, RECORDING_LIMITS.TIMER_INTERVAL_MS);
        } catch (err) {
            console.error("Microphone access denied or error:", err);
            toast({
                title: t(
                    "chat.microphoneAccessDenied",
                    "Не удалось получить доступ к микрофону. Проверьте разрешения.",
                ),
                variant: "error",
            });
        }
    };

    const stopRecording = useCallback(() => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === RECORDER_STATE.RECORDING
        ) {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        stopRecognition();
        setIsRecording(false);
        setRecordingTime(0);
        resetTranscript();
        audioChunksRef.current = [];
    }, [stopRecognition, resetTranscript]);

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state === RECORDER_STATE.RECORDING
            ) {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    return {
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
        stopAndFinishRecording,
    };
}
