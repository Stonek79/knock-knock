import {
    LiveKitRoom,
    RoomAudioRenderer,
    useLocalParticipant,
} from "@livekit/components-react";
import { Minimize2, Settings, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { IconButton } from "@/components/ui/IconButton";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { CALL_TYPE, ICON_SIZE } from "@/lib/constants";
import { ACTIVE_CALL_STATUS } from "@/lib/constants/calls";
import { useCallStore } from "../../store";
import { CallAvatarView } from "../CallAvatarView/CallAvatarView";
import { CallControlBar } from "../CallControlBar/CallControlBar";
import { CallPiP } from "../CallPiP/CallPiP";
import { CallVideoView } from "../CallVideoView/CallVideoView";
import styles from "./CallRoom.module.css";

/**
 * Синхронизирует Zustand состояние (isMuted, isVideoMuted)
 * с реальным локальным участником LiveKit после подключения.
 */
function LiveKitSync() {
    const { localParticipant } = useLocalParticipant();
    const activeSession = useCallStore((state) => state.activeSession);

    useEffect(() => {
        if (!localParticipant || !activeSession) {
            return;
        }
        localParticipant
            .setMicrophoneEnabled(!activeSession.isMuted)
            .catch(console.error);
    }, [activeSession?.isMuted, localParticipant, activeSession]);

    useEffect(() => {
        if (!localParticipant || !activeSession) {
            return;
        }
        localParticipant
            .setCameraEnabled(!activeSession.isVideoMuted)
            .catch(console.error);
    }, [activeSession?.isVideoMuted, localParticipant, activeSession]);

    useEffect(() => {
        if (!localParticipant || !activeSession) {
            return;
        }
        localParticipant
            .setScreenShareEnabled(!!activeSession.isScreenSharing)
            .catch(console.error);
    }, [activeSession?.isScreenSharing, localParticipant, activeSession]);

    return null;
}

/**
 * Кастомная комната вызова (WebRTC / LiveKit)
 * Поддерживает адаптивный интерфейс (мобильный полноэкранный / десктопная модалка)
 * и свертывание в Picture-in-Picture (PiP).
 */
export function CallRoom() {
    const { t } = useTranslation();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    const activeSession = useCallStore((state) => state.activeSession);
    const endCall = useCallStore((state) => state.endCall);
    const toggleMute = useCallStore((state) => state.toggleMute);
    const toggleVideoMuted = useCallStore((state) => state.toggleVideoMuted);
    const toggleScreenSharing = useCallStore(
        (state) => state.toggleScreenSharing,
    );

    const [isMinimized, setIsMinimized] = useState(false);

    if (!activeSession) {
        return null;
    }

    const {
        status,
        type,
        displayName,
        avatarUrl,
        token,
        serverUrl,
        isMuted,
        isVideoMuted,
        isScreenSharing,
    } = activeSession;
    const participantName =
        displayName || t("calls.privateParticipant", "Анонимный собеседник");

    // Определяем текст статуса для пользователя через i18n ключи
    let statusText = t("calls.statusConnecting", "Соединение...");
    let isConnecting = true;

    switch (status) {
        case ACTIVE_CALL_STATUS.INITIATING:
            statusText = t("calls.statusCalling", "Инициализация...");
            isConnecting = true;
            break;
        case ACTIVE_CALL_STATUS.CALLING:
            statusText = t("calls.statusCalling", "Вызов...");
            isConnecting = true;
            break;
        case ACTIVE_CALL_STATUS.ACTIVE:
            statusText = t("calls.statusActive", "Звонок активен");
            isConnecting = false;
            break;
        case ACTIVE_CALL_STATUS.RECONNECTING:
            statusText = t(
                "calls.statusReconnecting",
                "Восстановление связи...",
            );
            isConnecting = true;
            break;
    }

    // Если свернуто в PiP
    if (isMinimized) {
        return (
            <CallPiP
                displayName={participantName}
                avatarUrl={avatarUrl}
                statusText={statusText}
                isMuted={isMuted}
                onExpand={() => {
                    setIsMinimized(false);
                }}
                onToggleMute={toggleMute}
                onEndCall={endCall}
            />
        );
    }

    // Для любых звонков в активном статусе рендерим LiveKitRoom для аудио/видео
    const isWebRTCActive =
        (status === ACTIVE_CALL_STATUS.ACTIVE ||
            status === ACTIVE_CALL_STATUS.CONNECTING ||
            status === ACTIVE_CALL_STATUS.CALLING) &&
        typeof token === "string" &&
        typeof serverUrl === "string";

    const hasVideo = type === CALL_TYPE.VIDEO || !isVideoMuted;

    const overlayClass = isMobile
        ? `${styles.mobileOverlay} ${hasVideo ? styles.hasVideo : ""}`
        : `${styles.desktopOverlay} ${hasVideo ? styles.hasVideo : ""}`;

    const modalContent = (
        <Box
            className={`${isMobile ? styles.mobileModal : styles.desktopModal} ${hasVideo ? styles.hasVideo : ""}`}
        >
            {/* Верхняя шапка с кнопками действий */}
            <Flex
                align="center"
                justify="between"
                className={`${styles.header} ${hasVideo ? styles.hasVideo : ""}`}
            >
                <IconButton
                    className={styles.topIconBtn}
                    onClick={() => {
                        setIsMinimized(true);
                    }}
                    tooltip={t("calls.minimize", "Свернуть в PiP")}
                >
                    <Minimize2 size={ICON_SIZE.sm} />
                </IconButton>

                {!isMobile && (
                    <Flex
                        align="center"
                        gap="2"
                        className={styles.headerActions}
                    >
                        <IconButton
                            className={styles.topIconBtn}
                            tooltip={t(
                                "contacts.invite",
                                "Пригласить участника",
                            )}
                        >
                            <UserPlus size={ICON_SIZE.sm} />
                        </IconButton>
                        <IconButton
                            className={styles.topIconBtn}
                            tooltip={t("settings.title", "Настройки")}
                        >
                            <Settings size={ICON_SIZE.sm} />
                        </IconButton>
                    </Flex>
                )}
            </Flex>

            {/* Основной контент */}
            <Box className={styles.mainContent}>
                {isWebRTCActive ? (
                    <LiveKitRoom
                        video={!isVideoMuted}
                        audio={!isMuted}
                        token={token}
                        serverUrl={serverUrl}
                        connect={true}
                        data-lk-theme="default"
                        className={styles.liveKitRoom}
                        onDisconnected={endCall}
                    >
                        <LiveKitSync />
                        <CallVideoView
                            displayName={participantName}
                            avatarUrl={avatarUrl}
                            statusText={statusText}
                            isConnecting={isConnecting}
                        />
                        <RoomAudioRenderer />
                    </LiveKitRoom>
                ) : (
                    <CallAvatarView
                        displayName={participantName}
                        avatarUrl={avatarUrl}
                        statusText={statusText}
                        isConnecting={isConnecting}
                    />
                )}
            </Box>

            {/* Нижняя панель управления */}
            <Box
                className={`${styles.controlBarWrapper} ${hasVideo ? styles.hasVideo : ""}`}
            >
                <CallControlBar
                    isMuted={isMuted}
                    isVideoMuted={isVideoMuted}
                    isScreenSharing={isScreenSharing}
                    onToggleMute={toggleMute}
                    onToggleVideo={toggleVideoMuted}
                    onToggleScreenShare={toggleScreenSharing}
                    onEndCall={endCall}
                    showVideoOption={true}
                    showScreenShareOption={!isMobile}
                />
            </Box>
        </Box>
    );

    return <Box className={overlayClass}>{modalContent}</Box>;
}
