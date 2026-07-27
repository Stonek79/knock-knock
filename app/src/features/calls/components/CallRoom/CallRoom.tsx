import {
    LiveKitRoom,
    RoomAudioRenderer,
    useConnectionState,
    useRemoteParticipants,
    VideoConference,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { PhoneOff, Video, Volume2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Container } from "@/components/layout/Container";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { CALL_TYPE, ICON_SIZE } from "@/lib/constants";
import { useCallStore } from "../../store";
import styles from "./CallRoom.module.css";

function CallRoomContent() {
    const { t } = useTranslation();
    const toast = useToast();
    const { endCall, callType } = useCallStore();
    const connectionState = useConnectionState();
    const remoteParticipants = useRemoteParticipants();

    const actionsRef = useRef({ endCall, toast, t });
    useEffect(() => {
        actionsRef.current = { endCall, toast, t };
    });

    useEffect(() => {
        if (
            connectionState === ConnectionState.Connected &&
            remoteParticipants.length === 0
        ) {
            const timer = setTimeout(() => {
                const { endCall, toast, t } = actionsRef.current;
                toast({
                    title: t("calls.error", "Ошибка звонка"),
                    description: t(
                        "calls.errors.TIMEOUT",
                        "Абонент не отвечает или недоступен",
                    ),
                    variant: "error",
                });
                endCall();
            }, 60000);

            return () => clearTimeout(timer);
        }
    }, [connectionState, remoteParticipants.length]);

    // Режим исходящего звонка (ожидание собеседника)
    if (remoteParticipants.length === 0) {
        return (
            <Box className={styles.callingScreen}>
                <Box className={styles.callingAvatarWrapper}>
                    <Box className={styles.pulseRing} />
                    <Box className={styles.pulseRingSecond} />
                    <Avatar
                        size="xl"
                        fallback={callType === CALL_TYPE.VIDEO ? "📹" : "📞"}
                        className={styles.callingAvatar}
                    />
                </Box>

                <header className={styles.callingHeader}>
                    <Heading as="h2" size="lg" className={styles.callingTitle}>
                        {t("calls.calling", "Исходящий вызов")}
                    </Heading>
                    <Text className={styles.callingSubtitle}>
                        {connectionState === ConnectionState.Connecting
                            ? t("calls.connecting", "Подключение к серверу...")
                            : t(
                                  "calls.waiting_answer",
                                  "Ожидание ответа собеседника...",
                              )}
                    </Text>
                    <Badge variant="outline" className={styles.callTypeBadge}>
                        {callType === CALL_TYPE.VIDEO ? (
                            <>
                                <Video size={ICON_SIZE.sm} />
                                {t("calls.type_video", "Видеозвонок")}
                            </>
                        ) : (
                            <>
                                <Volume2 size={ICON_SIZE.sm} />
                                {t("calls.type_audio", "Аудиозвонок")}
                            </>
                        )}
                    </Badge>
                </header>

                <footer className={styles.callingFooter}>
                    <Button
                        type="button"
                        variant="solid"
                        intent="error"
                        size="lg"
                        className={styles.endCallButton}
                        onClick={endCall}
                    >
                        <PhoneOff size={ICON_SIZE.md} />
                        {t("calls.cancel", "Отменить вызов")}
                    </Button>
                </footer>
                <RoomAudioRenderer />
            </Box>
        );
    }

    // Режим активного звонка
    return (
        <Box className={styles.conferenceWrapper}>
            <VideoConference />
            <RoomAudioRenderer />
        </Box>
    );
}

/**
 * Компонент окна видеоконференции (LiveKit).
 * Отображает интерфейс звонка поверх приложения с премиальным Mobile-First дизайном на базе UI kit.
 */
export function CallRoom() {
    const { t } = useTranslation();
    const { isActive, token, serverUrl, callType, endCall } = useCallStore();

    if (!isActive || !token || !serverUrl) {
        return null;
    }

    return (
        <Container className={styles.overlay}>
            <Box
                className={styles.window}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <header className={styles.header}>
                    <Box className={styles.headerTitleGroup}>
                        <Heading as="h3" size="md" className={styles.title}>
                            {callType === CALL_TYPE.VIDEO
                                ? t(
                                      "calls.room_title_video",
                                      "Видеоконференция",
                                  )
                                : t("calls.room_title_audio", "Аудиозвонок")}
                        </Heading>
                        <Badge
                            variant="soft"
                            intent="success"
                            className={styles.statusBadge}
                        >
                            Live
                        </Badge>
                    </Box>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={styles.closeBtn}
                        onClick={endCall}
                        aria-label={t("calls.end_call", "Завершить звонок")}
                    >
                        <X size={ICON_SIZE.md} />
                    </Button>
                </header>

                <Box className={styles.content}>
                    <LiveKitRoom
                        video={callType === CALL_TYPE.VIDEO}
                        audio={true}
                        token={token}
                        serverUrl={serverUrl}
                        onDisconnected={endCall}
                        className={styles.liveKitContainer}
                        data-lk-theme="default"
                    >
                        <CallRoomContent />
                    </LiveKitRoom>
                </Box>
            </Box>
        </Container>
    );
}
