import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_MIME_TYPES, RECORDING_LIMITS } from "@/lib/constants";

const RECORDER_STATE = {
    INACTIVE: "inactive",
    RECORDING: "recording",
    PAUSED: "paused",
} as const;

interface UseVideoRecorderProps {
    disabled?: boolean;
    sending?: boolean;
    onRecordingComplete: (videoBlob: Blob) => void;
}

export function useVideoRecorder({
    disabled,
    sending,
    onRecordingComplete,
}: UseVideoRecorderProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const videoChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isCancelledRef = useRef(false);
    const streamRef = useRef<MediaStream | null>(null);

    // Используем refs для параметров, чтобы не пересоздавать коллбеки
    const disabledRef = useRef(disabled);
    const sendingRef = useRef(sending);
    const onRecordingCompleteRef = useRef(onRecordingComplete);
    const tRef = useRef(t);
    const toastRef = useRef(toast);

    useEffect(() => {
        disabledRef.current = disabled;
        sendingRef.current = sending;
        onRecordingCompleteRef.current = onRecordingComplete;
        tRef.current = t;
        toastRef.current = toast;
    }, [disabled, sending, onRecordingComplete, t, toast]);

    const stopAndFinishRecording = useCallback(() => {
        isCancelledRef.current = true;

        if (!isRecording || !mediaRecorderRef.current) {
            return;
        }

        if (mediaRecorderRef.current.state === RECORDER_STATE.INACTIVE) {
            return;
        }

        mediaRecorderRef.current.onstop = () => {
            streamRef.current?.getTracks().forEach((t) => {
                t.stop();
            });
            setStream(null);

            const actualMimeType =
                mediaRecorderRef.current?.mimeType ||
                DEFAULT_MIME_TYPES.WEBM_VIDEO;

            const videoBlob = new Blob(videoChunksRef.current, {
                type: actualMimeType,
            });

            if (videoBlob.size > 0 && !isCancelledRef.current) {
                onRecordingCompleteRef.current(videoBlob);
            }
            videoChunksRef.current = [];
        };

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
            setIsRecording(false);
            setRecordingTime(0);
        }, 100);
    }, [isRecording]);

    const stopRecording = useCallback(() => {
        isCancelledRef.current = true;
        if (!mediaRecorderRef.current) {
            setIsRecording(false);
            setRecordingTime(0);
            return;
        }

        mediaRecorderRef.current.onstop = () => {
            streamRef.current?.getTracks().forEach((t) => {
                t.stop();
            });
            setStream(null);
            videoChunksRef.current = [];
        };

        if (mediaRecorderRef.current.state !== RECORDER_STATE.INACTIVE) {
            mediaRecorderRef.current.stop();
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
        }
        setIsRecording(false);
        setRecordingTime(0);
    }, []);

    const stopAndFinishRecordingRef = useRef(stopAndFinishRecording);
    useEffect(() => {
        stopAndFinishRecordingRef.current = stopAndFinishRecording;
    }, [stopAndFinishRecording]);

    const startRecording = useCallback(async () => {
        if (disabledRef.current || sendingRef.current) {
            return;
        }

        try {
            isCancelledRef.current = false;

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    aspectRatio: 1,
                },
                audio: true,
            });

            streamRef.current = mediaStream;
            setStream(mediaStream);

            videoChunksRef.current = [];

            const options = { mimeType: DEFAULT_MIME_TYPES.WEBM_VIDEO };
            let recorder: MediaRecorder;
            try {
                recorder = new MediaRecorder(mediaStream, options);
            } catch (_e) {
                recorder = new MediaRecorder(mediaStream);
            }

            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    videoChunksRef.current.push(event.data);
                }
            };

            recorder.start(100);
            setIsRecording(true);
            setRecordingTime(0);

            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => {
                    const next = prev + 1;
                    if (next >= RECORDING_LIMITS.MAX_DURATION_SECONDS) {
                        stopAndFinishRecordingRef.current();
                        return prev;
                    }
                    return next;
                });
            }, 1000);
        } catch (error) {
            console.error("Error accessing media devices.", error);
            toastRef.current({
                title: tRef.current("chat.errors.microphone_access_denied", {
                    defaultValue: "Нет доступа к камере или микрофону",
                }),
                variant: "error",
            });
        }
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (stopTimeoutRef.current) {
                clearTimeout(stopTimeoutRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => {
                    t.stop();
                });
            }
            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !== RECORDER_STATE.INACTIVE
            ) {
                mediaRecorderRef.current.onstop = null;
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
        stream,
    };
}
