import {
    type KeyboardEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { DEFAULT_MIME_TYPES } from "@/lib/constants";

interface UseMessageInputProps {
    onSend: (text: string, files?: File[], audioBlob?: Blob) => Promise<void>;
    onCancel?: () => void;
    disabled?: boolean;
    initialValue?: string;
}

const RECORDER_STATE = {
    STOPPED: "stopped",
    RECORDING: "recording",
    PAUSED: "paused",
} as const;

/** Минимальная высота текстового поля (px) */
const TEXTAREA_MIN_HEIGHT = 40;
/** Максимальная высота текстового поля (px) */
const TEXTAREA_MAX_HEIGHT = 160;
/** Порог мобильного экрана (px) — Enter на мобильных = перенос строки */
const MOBILE_BREAKPOINT_PX = 768;

export function useMessageInput({
    onSend,
    onCancel,
    disabled,
    initialValue,
}: UseMessageInputProps) {
    // ... existing state ...
    const [message, setMessage] = useState(initialValue || "");
    const [sending, setSending] = useState(false);

    // Вложения (Файлы/Изображения)
    const [attachments, setAttachments] = useState<File[]>([]);
    const [attachmentCaption, setAttachmentCaption] = useState("");

    // Запись аудио
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const hasText = message.trim().length > 0;

    // ... adjustHeight ...
    const adjustHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${TEXTAREA_MIN_HEIGHT}px`;
            if (message.trim()) {
                const scrollHeight = textarea.scrollHeight;
                textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
            }
        }
    }, [message]);

    useEffect(() => {
        adjustHeight();
    }, [adjustHeight]);

    // При изменении initialValue (режим редактирования) обновляем поле и ставим фокус
    useEffect(() => {
        let focusTimer: ReturnType<typeof setTimeout> | null = null;

        if (initialValue !== undefined) {
            setMessage(initialValue || "");
            // Автофокус при входе в режим редактирования
            if (initialValue) {
                focusTimer = setTimeout(() => textareaRef.current?.focus(), 50);
            }
        }

        // Очистка таймера при размонтировании
        return () => {
            if (focusTimer) {
                clearTimeout(focusTimer);
            }
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
    }, [initialValue]);

    // Отправка обычного текстового сообщения
    const handleSend = async () => {
        if (!hasText || sending || disabled) {
            return;
        }

        setSending(true);
        try {
            await onSend(message.trim());
            setMessage("");
        } finally {
            setSending(false);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 10);
        }
    };

    // Отправка вложений через модальное окно
    const handleSendAttachments = async () => {
        if (attachments.length === 0 || sending || disabled) {
            return;
        }

        setSending(true);
        try {
            await onSend(attachmentCaption.trim(), attachments);
            setAttachments([]);
            setAttachmentCaption("");
        } finally {
            setSending(false);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 10);
        }
    };

    // ... Audio Recording ...
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

            mediaRecorder.onstop = () => {
                // Остановка всех треков микрофона, чтобы не горела лампочка
                const tracks = stream.getTracks();
                for (let i = 0; i < tracks.length; i++) {
                    tracks[i].stop();
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Microphone access denied or error:", err);
            // TODO: Показать Toast с ошибкой
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
        setIsRecording(false);
        setRecordingTime(0);
        audioChunksRef.current = [];
    }, []);

    const stopAndSendRecording = useCallback(() => {
        if (!isRecording || !mediaRecorderRef.current) {
            return;
        }

        mediaRecorderRef.current.onstop = async () => {
            // Остановка треков
            const tracks = mediaRecorderRef.current?.stream.getTracks() || [];
            for (let i = 0; i < tracks.length; i++) {
                tracks[i].stop();
            }

            const audioBlob = new Blob(audioChunksRef.current, {
                type: DEFAULT_MIME_TYPES.WEBM_AUDIO,
            });
            if (audioBlob.size > 0) {
                setSending(true);
                try {
                    await onSend("", undefined, audioBlob);
                } finally {
                    setSending(false);
                }
            }
            audioChunksRef.current = [];
        };

        mediaRecorderRef.current.stop();
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setIsRecording(false);
        setRecordingTime(0);
    }, [isRecording, onSend]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Escape" && onCancel) {
            e.preventDefault();
            onCancel();
            setMessage(""); // Clear input on cancel? Or keep? Usually reset.
            return;
        }

        if (e.key === "Enter" && !e.shiftKey) {
            if (window.innerWidth > MOBILE_BREAKPOINT_PX) {
                e.preventDefault();
                handleSend();
            }
        }
    };

    return {
        message,
        setMessage,
        sending,
        textareaRef,
        hasText,
        handleSend,
        handleKeyDown,
        attachments,
        setAttachments,
        attachmentCaption,
        setAttachmentCaption,
        handleSendAttachments,
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
        stopAndSendRecording,
    };
}
