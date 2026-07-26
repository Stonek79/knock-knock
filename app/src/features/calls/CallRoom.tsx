import {
    LiveKitRoom,
    RoomAudioRenderer,
    VideoConference,
} from "@livekit/components-react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { CALL_TYPE, ICON_SIZE } from "@/lib/constants";
import styles from "./CallRoom.module.css";
import { useCallStore } from "./store";

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
                        {/* 
                          Используем стандартные компоненты LiveKit, 
                          но они наследуют наши CSS-переменные из .liveKitContainer 
                        */}
                        <VideoConference />
                        <RoomAudioRenderer />
                    </LiveKitRoom>
                </div>
            </Box>
        </Container>
    );
}
