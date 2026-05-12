import { useEffect, useRef, useState } from "react";
import { AUDIO_PLAYER } from "@/lib/constants";
import { useMedia } from "@/lib/mediadb/useMedia";

/**
 * Состояние аудиоплеера.
 */
export type AudioPlayerState = {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    decryptedSrc: string | undefined;
};

/**
 * Управление аудиоплеером.
 */
export type AudioPlayerControls = {
    togglePlay: (e: React.MouseEvent) => void;
    seek: (time: number) => void;
    handleSeek: (value: number[]) => void;
};

/**
 * Параметры хука useAudioPlayer.
 */
export type UseAudioPlayerParams = {
    /** ID медиа-записи для кеширования в Dexie */
    mediaId?: string;
    /** ID пользователя для изоляции кэша */
    userId: string;
    /** Ключ комнаты для расшифровки */
    roomKey?: CryptoKey;
    /** MIME тип аудио */
    mimeType?: string;
    /** Начальный URL */
    initialUrl?: string;
};

/**
 * Хук для управления воспроизведением аудио с использованием новой системы кеширования.
 */
export function useAudioPlayer({
    mediaId,
    userId,
    roomKey,
    initialUrl,
}: UseAudioPlayerParams): {
    state: AudioPlayerState;
    controls: AudioPlayerControls;
    audioRef: React.RefObject<HTMLAudioElement | null>;
} {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Используем новый хук для прозрачной расшифровки и кеширования
    const { objectUrl: decryptedSrc } = useMedia({
        mediaId,
        userId,
        roomKey,
        initialUrl,
    });

    // Подписка на события аудио
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !decryptedSrc) {
            return;
        }

        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onLoadedMetadata = () => {
            if (!Number.isFinite(audio.duration) || audio.duration === 0) {
                audio.currentTime = AUDIO_PLAYER.SEEK_TO_END_VALUE;
                audio.addEventListener(
                    "seeked",
                    () => {
                        setDuration(audio.duration);
                        audio.currentTime = 0;
                    },
                    { once: true },
                );
            } else {
                setDuration(audio.duration);
            }
        };

        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("loadedmetadata", onLoadedMetadata);
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);

        return () => {
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("loadedmetadata", onLoadedMetadata);
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("play", onPlay);
            audio.removeEventListener("pause", onPause);

            // Очищаем источник, чтобы браузер перестал буферизовать удаленный (revoked) Blob
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
        };
    }, [decryptedSrc]);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current || !decryptedSrc) {
            return;
        }

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(console.error);
        }
    };

    const seek = (time: number) => {
        if (!audioRef.current) {
            return;
        }
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

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
