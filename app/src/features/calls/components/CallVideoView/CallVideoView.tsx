import {
    useLocalParticipant,
    useTracks,
    VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Box } from "@/components/layout/Box";
import { CallAvatarView } from "../CallAvatarView/CallAvatarView";
import styles from "./CallVideoView.module.css";

interface CallVideoViewProps {
    displayName: string;
    avatarUrl?: string | null;
    statusText: string;
    isConnecting?: boolean;
}

/**
 * Компонент для отображения видео-звонка.
 * Рендерит удаленного собеседника на весь экран. Если удаленного видео нет,
 * на весь экран отображается локальное видео пользователя.
 * Если оба видео включены, локальное видео отображается в плавающем окне (PiP).
 */
export function CallVideoView({
    displayName,
    avatarUrl,
    statusText,
    isConnecting = false,
}: CallVideoViewProps) {
    // Получаем все треки камер (и локальные, и удаленные)
    const cameraTracks = useTracks([Track.Source.Camera]);
    const remoteTrackRef = cameraTracks.find((t) => !t.participant.isLocal);
    const localTrackRef = cameraTracks.find((t) => t.participant.isLocal);

    // Получаем статус включения камеры от локального участника
    const { isCameraEnabled } = useLocalParticipant();

    const isRemoteVideoOff = !remoteTrackRef;
    const isLocalVideoOff = !isCameraEnabled || !localTrackRef;

    return (
        <Box className={styles.videoContainer}>
            {/* Background Layer: Remote video or Avatar */}
            <Box className={styles.backgroundLayer}>
                {!isRemoteVideoOff ? (
                    <VideoTrack
                        trackRef={remoteTrackRef}
                        className={styles.fullScreenVideo}
                    />
                ) : (
                    <Box className={styles.avatarGlassLayer}>
                        <CallAvatarView
                            displayName={displayName}
                            avatarUrl={avatarUrl}
                            statusText={statusText}
                            isConnecting={isConnecting}
                        />
                    </Box>
                )}
            </Box>

            {/* Foreground Layer (Picture-in-Picture): Local video when ON */}
            {!isLocalVideoOff && localTrackRef && (
                <Box className={styles.localPipLayer}>
                    <VideoTrack
                        trackRef={localTrackRef}
                        className={styles.localVideo}
                    />
                </Box>
            )}
        </Box>
    );
}
