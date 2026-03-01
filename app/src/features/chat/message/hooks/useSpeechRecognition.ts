import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";

/**
 * Интерфейс для результатов SpeechRecognition.
 */
interface SpeechRecognitionResult {
    isFinal: boolean;
    [key: number]: { transcript: string };
}

/**
 * Интерфейс для события onresult.
 */
interface SpeechRecognitionEvent {
    results: SpeechRecognitionResult[];
    resultIndex: number;
}

/**
 * Общий интерфейс для Web Speech API.
 */
interface SpeechRecognitionInstance {
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: (event: SpeechRecognitionEvent | unknown) => void;
    onerror: (event: unknown) => void;
    lang: string;
    continuous: boolean;
    interimResults: boolean;
}

/**
 * Тип для конструктора SpeechRecognition в глобальном объекте window.
 */
type WindowWithSpeech = Window &
    typeof globalThis & {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };

/**
 * Хук для транскрибации речи в текст с использованием Web Speech API.
 */
export function useSpeechRecognition(lang = "ru-RU") {
    const { t } = useTranslation();
    const toast = useToast();
    const [transcript, setTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");
    const transcriptRef = useRef("");
    const interimRef = useRef("");
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    const startRecognition = useCallback(() => {
        try {
            const w = window as unknown as WindowWithSpeech;
            const SpeechRecognition =
                w.SpeechRecognition || w.webkitSpeechRecognition;

            if (!SpeechRecognition) {
                console.warn(
                    "Speech Recognition API is not supported in this browser.",
                );
                toast({
                    title: t(
                        "chat.speechNotSupported",
                        "Распознавание речи не поддерживается в этом браузере.",
                    ),
                    variant: "error",
                });
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = lang;
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event: unknown) => {
                let finalStr = "";
                let interimStr = "";
                const speechEvent = event as SpeechRecognitionEvent;
                const results = speechEvent.results;
                const resultIndex = speechEvent.resultIndex;

                for (let i = resultIndex; i < results.length; ++i) {
                    if (results[i].isFinal) {
                        finalStr += results[i][0].transcript;
                    } else {
                        interimStr += results[i][0].transcript;
                    }
                }

                if (finalStr) {
                    transcriptRef.current += `${finalStr} `;
                    setTranscript(transcriptRef.current);
                }
                interimRef.current = interimStr;
                setInterimTranscript(interimStr);
            };

            recognition.onerror = (event: unknown) => {
                console.error("Speech recognition error", event);
                toast({
                    title: t(
                        "chat.speechError",
                        "Произошла ошибка при распознавании речи.",
                    ),
                    variant: "error",
                });
            };

            recognition.start();
            recognitionRef.current = recognition;
        } catch (err) {
            console.error("Failed to start speech recognition", err);
            toast({
                title: t(
                    "chat.speechStartFailed",
                    "Не удалось запустить распознавание речи.",
                ),
                variant: "error",
            });
        }
    }, [lang, t, toast]);

    const stopRecognition = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (_err) {
                // Игнорируем ошибку, если уже остановлено
                console.error("Failed to stop speech recognition", _err);
            }
            recognitionRef.current = null;
        }
    }, []);

    const resetTranscript = useCallback(() => {
        transcriptRef.current = "";
        interimRef.current = "";
        setTranscript("");
        setInterimTranscript("");
    }, []);

    const getTranscript = useCallback(() => {
        return transcriptRef.current + interimRef.current;
    }, []);

    return {
        transcript: `${transcript}${interimTranscript}`,
        getTranscript,
        startRecognition,
        stopRecognition,
        resetTranscript,
    };
}
