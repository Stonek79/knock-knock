import * as SliderPrimitive from "@radix-ui/react-slider";
import { ChevronUp, Pause, Play } from "lucide-react";
import type { MouseEvent } from "react";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { AUDIO_PLAYER, AUDIO_PLAYER_CONSTANTS } from "@/lib/constants";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { formatTime } from "@/lib/utils/time";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import styles from "./AudioMessagePlayer.module.css";

/**
 * Пропсы компонента AudioMessagePlayer.
 */
export type AudioMessagePlayerProps = {
    /** ID медиа-записи для кеширования (media v3) */
    mediaId?: string;
    /** ID пользователя для изоляции кэша */
    userId: string;
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
};

/**
 * Компонент для проигрывания голосовых и аудио сообщений в чате.
 * Premium Telegram-like дизайн с точечным прогрессом.
 */
export function AudioMessagePlayer({
    mediaId,
    userId,
    isOwn,
    hasTranscript,
    isTranscriptExpanded,
    onToggleTranscript,
    roomKey,
    mimeType,
}: AudioMessagePlayerProps) {
    const { state, controls, audioRef } = useAudioPlayer({
        mediaId,
        userId,
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
            onPointerDownCapture={(e) => {
                e.stopPropagation();
            }}
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            {decryptedSrc && (
                <audio ref={audioRef} src={decryptedSrc} preload="metadata">
                    <track kind="captions" />
                </audio>
            )}

            {/* Кнопка Play/Pause */}
            <Button
                variant={buttonVariant}
                intent={buttonIntent}
                size="sm"
                className={styles.playButton}
                onClick={togglePlay}
                disabled={!decryptedSrc}
                aria-label={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? (
                    <Pause size={ICON_SIZE.sm} />
                ) : (
                    <Play size={ICON_SIZE.sm} />
                )}
            </Button>

            <Box className={styles.progressContainer}>
                {/* Слайдер прогресса  */}
                <SliderPrimitive.Root
                    value={[currentTime]}
                    max={duration || AUDIO_PLAYER.FALLBACK_DURATION}
                    step={AUDIO_PLAYER.SEEK_STEP}
                    onValueChange={handleSeek}
                    className={styles.sliderRoot}
                    disabled={!decryptedSrc}
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
            </Box>
        </Flex>
    );
}
