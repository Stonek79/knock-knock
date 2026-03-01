import * as SliderPrimitive from "@radix-ui/react-slider";
import clsx from "clsx";
import { ChevronUp, Pause, Play } from "lucide-react";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { Flex } from "@/components/layout/Flex";
import { Text } from "@/components/ui/Text";
import { AUDIO_PLAYER, DEFAULT_MIME_TYPES } from "@/lib/constants/storage";
import { decryptBlob } from "@/lib/crypto/messages";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./AudioMessagePlayer.module.css";

// TODO: большой и сложный компонент, явно требует декомпозиции, надо подумать над вынесением логики в отдельные хуки и утилиты.
// убрать магические строки в константы, например: "blob:", "data:", "0:00", "0.00"

interface AudioMessagePlayerProps {
    src: string;
    isOwn: boolean;
    hasTranscript?: boolean;
    isTranscriptExpanded?: boolean;
    onToggleTranscript?: () => void;
    roomKey?: CryptoKey;
    mimeType?: string;
}

const formatTime = (time: number) => {
    if (!time || Number.isNaN(time)) {
        return "0:00";
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Компонент для проигрывания голосовых и аудио сообщений в чате.
 * Premium Telegram-like дизайн с точечным прогрессом.
 */
export function AudioMessagePlayer({
    src,
    isOwn,
    hasTranscript,
    isTranscriptExpanded,
    onToggleTranscript,
    roomKey,
    mimeType,
}: AudioMessagePlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [decryptedSrc, setDecryptedSrc] = useState<string | undefined>(
        undefined,
    );

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
                src.startsWith("blob:") ||
                src.startsWith("data:")
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

    const handleSeek = (value: number[]) => {
        if (!audioRef.current || value.length === 0) {
            return;
        }
        audioRef.current.currentTime = value[0];
        setCurrentTime(value[0]);
    };

    const buttonClass = clsx(styles.playButton, {
        [styles.playButtonOwn]: isOwn,
        [styles.playButtonPeer]: !isOwn,
    });

    return (
        <Flex
            className={styles.container}
            align="center"
            gap="3"
            onClick={(e) => e.stopPropagation()}
        >
            <audio ref={audioRef} src={decryptedSrc} preload="metadata">
                <track kind="captions" />
            </audio>

            <button
                type="button"
                className={buttonClass}
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? (
                    <Pause size={ICON_SIZE.sm} />
                ) : (
                    <Play size={ICON_SIZE.sm} />
                )}
            </button>

            <Flex
                direction="column"
                justify="center"
                className={styles.progressContainer}
            >
                <SliderPrimitive.Root
                    value={[currentTime]}
                    max={duration || AUDIO_PLAYER.FALLBACK_DURATION}
                    step={AUDIO_PLAYER.SEEK_STEP}
                    onValueChange={handleSeek}
                    className={styles.sliderRoot}
                    aria-label="Прогресс воспроизведения"
                >
                    <SliderPrimitive.Track className={styles.audioTrack}>
                        <SliderPrimitive.Range className={styles.audioRange} />
                    </SliderPrimitive.Track>
                    <SliderPrimitive.Thumb className={styles.audioThumb} />
                </SliderPrimitive.Root>

                {/* Нижняя строчка с таймером и кнопкой транскрипции */}
                <Flex
                    justify="between"
                    align="center"
                    className={styles.timerRow}
                >
                    <Text size="xs" className={styles.timeText}>
                        {isPlaying || currentTime > 0
                            ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                            : formatTime(duration)}
                    </Text>
                    {hasTranscript && onToggleTranscript && (
                        <button
                            type="button"
                            className={styles.transcriptToggle}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleTranscript();
                            }}
                        >
                            {isTranscriptExpanded ? (
                                <ChevronUp size={ICON_SIZE.xs} />
                            ) : (
                                "→A"
                            )}
                        </button>
                    )}
                </Flex>
            </Flex>
        </Flex>
    );
}
