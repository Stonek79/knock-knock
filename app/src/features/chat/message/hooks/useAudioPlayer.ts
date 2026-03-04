import { type MouseEvent, useEffect, useRef, useState } from "react";
import {
    AUDIO_PLAYER,
    AUDIO_PLAYER_CONSTANTS,
    DEFAULT_MIME_TYPES,
} from "@/lib/constants/storage";
import { decryptBlob } from "@/lib/crypto/messages";

/**
 * Состояние аудиоплеера.
 */
export interface AudioPlayerState {
    /** Текущее время воспроизведения (сек) */
    currentTime: number;
    /** Общая длительность аудио (сек) */
    duration: number;
    /** Воспроизводится ли сейчас */
    isPlaying: boolean;
    /** Расшифрованный URL аудио (blob: или data:) */
    decryptedSrc: string | undefined;
}

/**
 * Управление аудиоплеером.
 */
export interface AudioPlayerControls {
    /** Переключение воспроизведения */
    togglePlay: (e: MouseEvent) => void;
    /** Перемотка на новое время */
    seek: (time: number) => void;
    /** Обработчик изменения значения слайдера */
    handleSeek: (value: number[]) => void;
}

/**
 * Параметры хука useAudioPlayer.
 */
export interface UseAudioPlayerParams {
    /** URL зашифрованного аудиофайла */
    src: string;
    /** Ключ комнаты для расшифровки (если есть) */
    roomKey?: CryptoKey;
    /** MIME тип аудио (по умолчанию audio/webm) */
    mimeType?: string;
}

/**
 * Хук для управления воспроизведением аудио с расшифровкой.
 *
 * @example
 * ```tsx
 * const { state, controls, audioRef } = useAudioPlayer({
 *   src: encryptedAudioUrl,
 *   roomKey: key,
 * });
 *
 * return (
 *   <>
 *     <audio ref={audioRef} src={state.decryptedSrc} />
 *     <button onClick={controls.togglePlay}>
 *       {state.isPlaying ? "Pause" : "Play"}
 *     </button>
 *   </>
 * );
 * ```
 */
export function useAudioPlayer({
    src,
    roomKey,
    mimeType,
}: UseAudioPlayerParams): {
    state: AudioPlayerState;
    controls: AudioPlayerControls;
    audioRef: React.RefObject<HTMLAudioElement | null>;
} {
    const audioRef = useRef<HTMLAudioElement>(null);

    // Состояния
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [decryptedSrc, setDecryptedSrc] = useState<string | undefined>(
        undefined,
    );

    // Загрузка и расшифровка аудио
    useEffect(() => {
        let isMounted = true;
        let objectUrl = "";

        const loadAndDecrypt = async () => {
            if (!src) {
                return;
            }

            // blob: и data: URL уже содержат незашифрованные данные (mock-режим)
            if (
                !roomKey ||
                src.startsWith(AUDIO_PLAYER_CONSTANTS.BLOB_PREFIX) ||
                src.startsWith(AUDIO_PLAYER_CONSTANTS.DATA_PREFIX)
            ) {
                if (isMounted) {
                    setDecryptedSrc(src);
                }
                return;
            }

            try {
                const response = await fetch(src);
                const encryptedBlob = await response.blob();
                const decryptedBlob = await decryptBlob(
                    encryptedBlob,
                    roomKey,
                    mimeType || DEFAULT_MIME_TYPES.WEBM_AUDIO,
                );

                if (isMounted) {
                    objectUrl = URL.createObjectURL(decryptedBlob);
                    setDecryptedSrc(objectUrl);
                }
            } catch (e) {
                console.error("Failed to decrypt audio blob", e);
                if (isMounted) {
                    setDecryptedSrc(src);
                }
            }
        };

        loadAndDecrypt();

        return () => {
            isMounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src, roomKey, mimeType]);

    // Подписка на события аудио
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) {
            return;
        }

        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onLoadedMetadata = () => {
            // Chrome WebM баг: MediaRecorder blobs не содержат длительность в метаданных,
            // audio.duration возвращает Infinity. Обходной путь: seek к концу файла.
            if (!Number.isFinite(audio.duration) || audio.duration === 0) {
                audio.currentTime = AUDIO_PLAYER.SEEK_TO_END_VALUE;
                audio.addEventListener(
                    "seeked",
                    () => {
                        setDuration(audio.duration);
                        audio.currentTime = 0; // Возвращаемся к началу
                    },
                    { once: true },
                );
            } else {
                setDuration(audio.duration);
            }
        };
        const onError = () => {
            console.error("[AudioPlayer] audio error:", audio.error);
        };
        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("loadedmetadata", onLoadedMetadata);
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", onError);

        return () => {
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("loadedmetadata", onLoadedMetadata);
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("error", onError);
        };
    }, []);

    // Переключение воспроизведения
    const togglePlay = (e: MouseEvent) => {
        e.stopPropagation();

        if (!audioRef.current) {
            return;
        }

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    // Перемотка
    const seek = (time: number) => {
        if (!audioRef.current) {
            return;
        }
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    // Обработчик для слайдера
    const handleSeek = (value: number[]) => {
        if (value.length === 0) {
            return;
        }
        seek(value[0]);
    };

    return {
        state: {
            currentTime,
            duration,
            isPlaying,
            decryptedSrc,
        },
        controls: {
            togglePlay,
            seek,
            handleSeek,
        },
        audioRef,
    };
}
