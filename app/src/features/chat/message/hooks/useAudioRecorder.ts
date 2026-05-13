import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_MIME_TYPES, RECORDING_LIMITS } from "@/lib/constants";
import { useSpeechRecognition } from "./useSpeechRecognition";

const RECORDER_STATE = {
    INACTIVE: "inactive",
    RECORDING: "recording",
    PAUSED: "paused",
} as const;

interface UseAudioRecorderProps {
    disabled?: boolean;
    sending?: boolean;
    onRecordingComplete: (
        transcript: string,
        audioBlob: Blob,
        transcriptSuccess: boolean,
    ) => void;
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
    const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isCancelledRef = useRef(false);
    const streamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const {
        getTranscript,
        startRecognition,
        stopRecognition,
        resetTranscript,
    } = useSpeechRecognition();

    const stopAndFinishRecording = useCallback(() => {
        isCancelledRef.current = true;

        if (!isRecording || !mediaRecorderRef.current) {
            return;
        }

        // Предотвращаем повторый вызов stop
        if (mediaRecorderRef.current.state === RECORDER_STATE.INACTIVE) {
            return;
        }

        mediaRecorderRef.current.onstop = () => {
            // Остановка треков
            streamRef.current?.getTracks().forEach((t) => {
                t.stop();
            });
            audioCtxRef.current?.close().catch(() => {});

            const actualMimeType =
                mediaRecorderRef.current?.mimeType ||
                DEFAULT_MIME_TYPES.WEBM_AUDIO;

            const audioBlob = new Blob(audioChunksRef.current, {
                type: actualMimeType,
            });

            if (audioBlob.size > 0) {
                const finalTranscript = getTranscript().trim();

                // Даже если транскрипция пустая, мы все равно передаем аудио-блоб.
                // transcriptSuccess = true означает, что аудио успешно записано.
                onRecordingComplete(finalTranscript, audioBlob, true);
            }
            audioChunksRef.current = [];
        };

        // Задержка перед остановкой для захвата хвоста речи
        stopTimeoutRef.current = setTimeout(() => {
            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !== RECORDER_STATE.INACTIVE
            ) {
                mediaRecorderRef.current.stop();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            stopRecognition();
            setIsRecording(false);
            setRecordingTime(0);
            stopTimeoutRef.current = null;
        }, RECORDING_LIMITS.STOP_DELAY_MS);
    }, [isRecording, onRecordingComplete, getTranscript, stopRecognition]);

    const startRecording = async () => {
        if (disabled || sending) {
            return;
        }

        // Мгновенный старт UI
        isCancelledRef.current = false;
        setIsRecording(true);
        setRecordingTime(0);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    autoGainControl: false, // Отключаем, чтобы не мешал нашему усилителю
                    echoCancellation: false,
                    noiseSuppression: false,
                },
            });

            // Если юзер отпустил кнопку пока мы ждали права
            if (isCancelledRef.current) {
                stream.getTracks().forEach((t) => {
                    t.stop();
                });
                setIsRecording(false);
                return;
            }

            // ПРОГРАММНОЕ УСИЛЕНИЕ ЗВУКА (Web Audio API)
            // Гарантированно повышает громкость на любой ОС
            const AudioContextClass = window.AudioContext;
            const audioCtx = new AudioContextClass();
            const source = audioCtx.createMediaStreamSource(stream);
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 2.5; // Буст громкости в 2.5 раза
            const destination = audioCtx.createMediaStreamDestination();
            source.connect(gainNode);
            gainNode.connect(destination);

            streamRef.current = stream;
            audioCtxRef.current = audioCtx;

            const mediaRecorder = new MediaRecorder(destination.stream);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start();
            resetTranscript();

            // Начинаем распознавание речи только после того, как получен доступ к микрофону
            startRecognition();

            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

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
            setIsRecording(false);
            streamRef.current?.getTracks().forEach((t) => {
                t.stop();
            });
            audioCtxRef.current?.close().catch(() => {});

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
        isCancelledRef.current = true;

        if (mediaRecorderRef.current) {
            if (mediaRecorderRef.current.state !== RECORDER_STATE.INACTIVE) {
                mediaRecorderRef.current.stop();
            }
        }

        streamRef.current?.getTracks().forEach((t) => {
            t.stop();
        });
        audioCtxRef.current?.close().catch(() => {});

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

            if (stopTimeoutRef.current) {
                clearTimeout(stopTimeoutRef.current);
            }

            if (mediaRecorderRef.current) {
                if (
                    mediaRecorderRef.current.state !== RECORDER_STATE.INACTIVE
                ) {
                    mediaRecorderRef.current.stop();
                }
            }

            streamRef.current?.getTracks().forEach((t) => {
                t.stop();
            });
            audioCtxRef.current?.close().catch(() => {});
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
