import * as SliderPrimitive from "@radix-ui/react-slider";
import { ChevronUp, Pause, Play } from "lucide-react";
import type { MouseEvent } from "react";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { AUDIO_PLAYER, AUDIO_PLAYER_CONSTANTS } from "@/lib/constants/storage";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { formatTime } from "@/lib/utils/time";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import styles from "./AudioMessagePlayer.module.css";

/**
 * Пропсы компонента AudioMessagePlayer.
 */
export interface AudioMessagePlayerProps {
    /** URL аудиофайла (зашифрованный или blob:/data:) */
    src: string;
    /** Своё ли сообщение (влияет на стиль кнопки) */
    isOwn: boolean;
    /** Есть ли транскрипция у сообщения */
    hasTranscript?: boolean;
    /** Развёрнута ли транскрипция */
    isTranscriptExpanded?: boolean;
    /** Обработчик переключения видимости транскрипции */
    onToggleTranscript?: () => void;
    /** Ключ комнаты для расшифровки */
    roomKey?: CryptoKey;
    /** MIME тип аудио (по умолчанию audio/webm) */
    mimeType?: string;
}

/**
 * Компонент для проигрывания голосовых и аудио сообщений в чате.
 * Premium Telegram-like дизайн с точечным прогрессом.
 *
 * @example
 * ```tsx
 * <AudioMessagePlayer
 *   src={message.audioUrl}
 *   isOwn={false}
 *   roomKey={roomKey}
 *   hasTranscript
 * />
 * ```
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
    const { state, controls, audioRef } = useAudioPlayer({
        src,
        roomKey,
        mimeType,
    });

    const { currentTime, duration, isPlaying, decryptedSrc } = state;
    const { togglePlay, handleSeek } = controls;

    const buttonVariant = isOwn ? "soft" : "solid";
    const buttonIntent = isOwn ? "primary" : "neutral";

    return (
        <Flex
            className={styles.container}
            align="center"
            gap="3"
            // Останавливаем onPointerDown в capture phase ДО MessageBubble
            // Это предотвращает срабатывание useLongPress (выделение сообщения)
            onPointerDownCapture={(e) => {
                // if (e.target !== e.currentTarget) {
                //     return;
                // }
                e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <audio ref={audioRef} src={decryptedSrc} preload="metadata">
                <track kind="captions" />
            </audio>

            {/* Кнопка Play/Pause */}
            <Button
                variant={buttonVariant}
                intent={buttonIntent}
                size="sm"
                className={styles.playButton}
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? (
                    <Pause size={ICON_SIZE.sm} />
                ) : (
                    <Play size={ICON_SIZE.sm} />
                )}
            </Button>

            <Flex
                direction="column"
                justify="center"
                className={styles.progressContainer}
            >
                {/* Слайдер прогресса */}
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
                    gap="2"
                >
                    <Text size="xs" className={styles.timeText}>
                        {isPlaying || currentTime > 0
                            ? `${formatTime(currentTime)}${AUDIO_PLAYER_CONSTANTS.TIME_SEPARATOR}${formatTime(duration)}`
                            : formatTime(duration)}
                    </Text>

                    {hasTranscript && onToggleTranscript && (
                        <Button
                            variant="ghost"
                            intent="neutral"
                            size="xs"
                            className={styles.transcriptToggle}
                            onClick={(e: MouseEvent) => {
                                e.stopPropagation();
                                onToggleTranscript();
                            }}
                            aria-label={
                                isTranscriptExpanded
                                    ? "Свернуть транскрипцию"
                                    : "Развернуть транскрипцию"
                            }
                        >
                            {isTranscriptExpanded ? (
                                <ChevronUp size={ICON_SIZE.xs} />
                            ) : (
                                <Text size="xs" weight="bold">
                                    →A
                                </Text>
                            )}
                        </Button>
                    )}
                </Flex>
            </Flex>
        </Flex>
    );
}
