import {
    type KeyboardEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { RECORDING_MODE } from "@/lib/constants";
import { useAudioRecorder } from "./useAudioRecorder";
import { useVideoRecorder } from "./useVideoRecorder";

interface UseMessageInputProps {
    onSend: (params: {
        text: string;
        files?: File[];
        audioBlob?: Blob;
        videoBlob?: Blob;
        isVideoMessage?: boolean;
    }) => Promise<void>;
    onCancel?: () => void;
    disabled?: boolean;
    initialValue?: string;
}

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
    const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
    const [recordingMode, setRecordingMode] = useState<
        typeof RECORDING_MODE.AUDIO | typeof RECORDING_MODE.VIDEO
    >(RECORDING_MODE.AUDIO);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const focusInput = useCallback(() => {
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
    }, []);

    const {
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
        stopAndFinishRecording: stopAndFinishAudioRecording,
    } = useAudioRecorder({
        disabled,
        sending,
        onRecordingComplete: (transcript, audioBlob, transcriptSuccess) => {
            if (transcriptSuccess) {
                if (transcript) {
                    setMessage((prev) =>
                        (prev ? `${prev} ${transcript}` : transcript).trim(),
                    );
                }
                setRecordedAudio(audioBlob);
            }
            focusInput();
        },
    });

    const {
        isRecording: isRecordingVideo,
        recordingTime: videoRecordingTime,
        startRecording: startVideoRecording,
        stopRecording: stopVideoRecording,
        stopAndFinishRecording: stopAndFinishVideoRecording,
        stream: videoStream,
    } = useVideoRecorder({
        disabled,
        sending,
        onRecordingComplete: (videoBlob) => {
            setRecordedVideo(videoBlob);
            focusInput();
        },
    });

    const hasText = message.trim().length > 0;
    const canSend = hasText || recordedAudio !== null || recordedVideo !== null;

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
                await onSend({
                    text: message.trim(),
                    audioBlob: recordedAudio,
                });
            } else if (recordedVideo) {
                await onSend({
                    text: message.trim(),
                    videoBlob: recordedVideo,
                    isVideoMessage: true,
                });
            } else {
                await onSend({ text: message.trim() });
            }
            setMessage("");
            setRecordedAudio(null);
            setRecordedVideo(null);
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
            setRecordedVideo(null);
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
        stopAndFinishRecording: stopAndFinishAudioRecording,
        recordedAudio,
        setRecordedAudio,

        isRecordingVideo,
        videoRecordingTime,
        startVideoRecording,
        stopVideoRecording,
        stopAndFinishVideoRecording,
        videoStream,
        recordedVideo,
        setRecordedVideo,

        recordingMode,
        setRecordingMode,
    };
}
