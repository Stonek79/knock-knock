import {
    LiveKitRoom,
    RoomAudioRenderer,
    useConnectionState,
    useRemoteParticipants,
    VideoConference,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { CALL_TYPE, ICON_SIZE } from "@/lib/constants";
import styles from "./CallRoom.module.css";
import { useCallStore } from "./store";

function CallRoomContent() {
    const { t } = useTranslation();
    const toast = useToast();
    const { endCall } = useCallStore();
    const connectionState = useConnectionState();
    const remoteParticipants = useRemoteParticipants();

    // Сохраняем функции в ref, чтобы избежать их добавления в зависимости useEffect
    // и предотвратить лишние пересоздания таймера
    const actionsRef = useRef({ endCall, toast, t });
    useEffect(() => {
        actionsRef.current = { endCall, toast, t };
    });

    useEffect(() => {
        // Мы подключены, но удаленных участников нет
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
            }, 60000); // 60 секунд ждем

            return () => clearTimeout(timer);
        }
    }, [connectionState, remoteParticipants.length]);

    return (
        <>
            {/* 
              Используем стандартные компоненты LiveKit, 
              но они наследуют наши CSS-переменные из .liveKitContainer 
            */}
            <VideoConference />
            <RoomAudioRenderer />
        </>
    );
}

/**
 * Компонент окна видеоконференции (LiveKit).
 * Отображает видеопотоки участников комнаты поверх остального интерфейса.
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
                role="dialog"
                aria-modal="true"
            >
                <div className={styles.header}>
                    <div className={styles.title}>
                        {t("calls.room_title", "Видеоконференция")}
                    </div>
                    <Button
                        type="button"
                        className={styles.closeBtn}
                        onClick={endCall}
                        aria-label={t("calls.end_call", "Завершить звонок")}
                    >
                        <X size={ICON_SIZE.md} />
                    </Button>
                </div>

                <div className={styles.content}>
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
                </div>
            </Box>
        </Container>
    );
}
