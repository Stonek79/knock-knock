import {
    Mic,
    MicOff,
    Monitor,
    MonitorOff,
    PhoneOff,
    Video,
    VideoOff,
    Volume2,
    VolumeX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Text } from "@/components/ui/Text";
import { ICON_SIZE } from "@/lib/constants";
import styles from "./CallControlBar.module.css";

interface CallControlBarProps {
    isMuted: boolean;
    isVideoMuted: boolean;
    isScreenSharing: boolean;
    isSpeakerOn?: boolean;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onToggleScreenShare?: () => void;
    onToggleSpeaker?: () => void;
    onEndCall: () => void;
    showVideoOption?: boolean;
    showScreenShareOption?: boolean;
}

/**
 * Нижняя панель быстрых действий вызова (микрофон, видео, экран, отбой).
 * Переведена на i18n ключи и UI-примитивы Flex, Box, Text.
 */
export function CallControlBar({
    isMuted,
    isVideoMuted,
    isScreenSharing,
    isSpeakerOn = true,
    onToggleMute,
    onToggleVideo,
    onToggleScreenShare,
    onToggleSpeaker,
    onEndCall,
    showVideoOption = true,
    showScreenShareOption = true,
}: CallControlBarProps) {
    const { t } = useTranslation();

    const speakerLabel = isSpeakerOn
        ? t("calls.speakerOn", "Динамик")
        : t("calls.speakerOff", "Выкл. динамик");

    const videoLabel = isVideoMuted
        ? t("calls.cameraOn", "Камера")
        : t("calls.cameraOff", "Выкл. камера");

    const micLabel = isMuted
        ? t("calls.unmute", "Включить звук")
        : t("calls.mute", "Без звука");

    return (
        <Flex
            align="start"
            justify="center"
            gap="4"
            className={styles.controlBar}
        >
            {onToggleSpeaker && (
                <Flex
                    direction="column"
                    align="center"
                    gap="2"
                    className={styles.actionItem}
                >
                    <button
                        type="button"
                        className={`${styles.actionButton} ${!isSpeakerOn ? styles.muted : ""}`}
                        onClick={onToggleSpeaker}
                        title={speakerLabel}
                    >
                        {isSpeakerOn ? (
                            <Volume2 size={ICON_SIZE.md} />
                        ) : (
                            <VolumeX size={ICON_SIZE.md} />
                        )}
                    </button>
                    <Text
                        size="xs"
                        weight="medium"
                        className={styles.actionLabel}
                    >
                        {speakerLabel}
                    </Text>
                </Flex>
            )}

            {showVideoOption && (
                <Flex
                    direction="column"
                    align="center"
                    gap="2"
                    className={styles.actionItem}
                >
                    <button
                        type="button"
                        className={`${styles.actionButton} ${!isVideoMuted ? styles.active : ""}`}
                        onClick={onToggleVideo}
                        title={videoLabel}
                    >
                        {isVideoMuted ? (
                            <VideoOff size={ICON_SIZE.md} />
                        ) : (
                            <Video size={ICON_SIZE.md} />
                        )}
                    </button>
                    <Text
                        size="xs"
                        weight="medium"
                        className={styles.actionLabel}
                    >
                        {videoLabel}
                    </Text>
                </Flex>
            )}

            {showScreenShareOption && onToggleScreenShare && (
                <Flex
                    direction="column"
                    align="center"
                    gap="2"
                    className={styles.actionItem}
                >
                    <button
                        type="button"
                        className={`${styles.actionButton} ${isScreenSharing ? styles.active : ""}`}
                        onClick={onToggleScreenShare}
                        title={t("calls.screenShare", "Демонстрация экрана")}
                    >
                        {isScreenSharing ? (
                            <MonitorOff size={ICON_SIZE.md} />
                        ) : (
                            <Monitor size={ICON_SIZE.md} />
                        )}
                    </button>
                    <Text
                        size="xs"
                        weight="medium"
                        className={styles.actionLabel}
                    >
                        {t("calls.screenShare", "Экран")}
                    </Text>
                </Flex>
            )}

            <Flex
                direction="column"
                align="center"
                gap="2"
                className={styles.actionItem}
            >
                <button
                    type="button"
                    className={`${styles.actionButton} ${isMuted ? styles.muted : ""}`}
                    onClick={onToggleMute}
                    title={micLabel}
                >
                    {isMuted ? (
                        <MicOff size={ICON_SIZE.md} />
                    ) : (
                        <Mic size={ICON_SIZE.md} />
                    )}
                </button>
                <Text size="xs" weight="medium" className={styles.actionLabel}>
                    {micLabel}
                </Text>
            </Flex>

            <Flex
                direction="column"
                align="center"
                gap="2"
                className={styles.actionItem}
            >
                <button
                    type="button"
                    className={`${styles.actionButton} ${styles.endCall}`}
                    onClick={onEndCall}
                    title={t("calls.end_call", "Завершить")}
                >
                    <PhoneOff size={ICON_SIZE.md} />
                </button>
                <Text size="xs" weight="medium" className={styles.actionLabel}>
                    {t("calls.end_call", "Завершить")}
                </Text>
            </Flex>
        </Flex>
    );
}
