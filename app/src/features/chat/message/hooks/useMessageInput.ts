import {
    type KeyboardEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { useAudioRecorder } from "./useAudioRecorder";

// TODO: сложный хук, подумать над декомпозицией и упрощением

interface UseMessageInputProps {
    onSend: (text: string, files?: File[], audioBlob?: Blob) => Promise<void>;
    onCancel?: () => void;
    disabled?: boolean;
    initialValue?: string;
}

/** Минимальная высота текстового поля (px) */
const TEXTAREA_MIN_HEIGHT = 40;
/** Максимальная высота текстового поля (px) */
const TEXTAREA_MAX_HEIGHT = 160;
/** Порог мобильного экрана (px) — Enter на мобильных = перенос строки */
const MOBILE_BREAKPOINT_PX = 768;

/**
 * Хук для управления вводом текста и аудиозаписью.
 */
export function useMessageInput({
    onSend,
    onCancel,
    disabled,
    initialValue,
}: UseMessageInputProps) {
    const [message, setMessage] = useState(initialValue || "");
    const [sending, setSending] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const {
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
        stopAndFinishRecording,
    } = useAudioRecorder({
        disabled,
        sending,
        onRecordingComplete: (transcript, audioBlob) => {
            if (transcript) {
                setMessage((prev) =>
                    (prev ? `${prev} ${transcript}` : transcript).trim(),
                );
            }
            setRecordedAudio(audioBlob);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 10);
        },
    });

    const hasText = message.trim().length > 0;
    const canSend = hasText || recordedAudio !== null;

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

    useEffect(() => {
        let focusTimer: ReturnType<typeof setTimeout> | null = null;
        if (initialValue !== undefined) {
            setMessage(initialValue || "");
            if (initialValue) {
                focusTimer = setTimeout(() => textareaRef.current?.focus(), 50);
            }
        }
        return () => {
            if (focusTimer) {
                clearTimeout(focusTimer);
            }
        };
    }, [initialValue]);

    const handleSend = async () => {
        if (!canSend || sending || disabled) {
            return;
        }
        setSending(true);
        try {
            if (recordedAudio) {
                await onSend(message.trim(), undefined, recordedAudio);
            } else {
                await onSend(message.trim());
            }
            setMessage("");
            setRecordedAudio(null);
        } finally {
            setSending(false);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 10);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Escape" && onCancel) {
            e.preventDefault();
            onCancel();
            setMessage("");
            setRecordedAudio(null);
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
        setSending,
        textareaRef,
        hasText,
        canSend,
        handleSend,
        handleKeyDown,
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
        stopAndFinishRecording,
        recordedAudio,
        setRecordedAudio,
    };
}
