import { useTracks, VideoTrack } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Box } from "@/components/layout/Box";
import { CallAvatarView } from "../CallAvatarView/CallAvatarView";
import styles from "./CallVideoView.module.css";

/**
 * Свойства компонента CallVideoView
 */
interface CallVideoViewProps {
    /** Имя или номер собеседника для отображения на аватаре, если камера выключена */
    displayName: string;
    /** Текущий статус звонка для отображения под аватаром */
    statusText: string;
    /** Флаг подключения для анимации аватара */
    isConnecting?: boolean;
}

/**
 * Компонент для отображения видео-звонка.
 * Рендерит удаленного собеседника на весь экран (или его аватар, если камера отключена),
 * а локальное видео пользователя отображает в плавающем окне (Picture-in-Picture).
 */
export function CallVideoView({
    displayName,
    statusText,
    isConnecting = false,
}: CallVideoViewProps) {
    // Получаем все треки камер (и локальные, и удаленные)
    const cameraTracks = useTracks([Track.Source.Camera]);

    const remoteTrack = cameraTracks.find((t) => !t.participant.isLocal);
    const localTrack = cameraTracks.find((t) => t.participant.isLocal);

    // Считаем, что собеседник подключен, но выключил видео, если трека нет
    const isRemoteVideoOff = !remoteTrack;

    return (
        <Box className={styles.videoContainer}>
            {/* Задний фон: удаленный собеседник (или аватар) */}
            <Box className={styles.remoteLayer}>
                {!isRemoteVideoOff ? (
                    <VideoTrack
                        trackRef={remoteTrack}
                        className={styles.remoteVideo}
                    />
                ) : (
                    <CallAvatarView
                        displayName={displayName}
                        statusText={statusText}
                        isConnecting={isConnecting}
                    />
                )}
            </Box>

            {/* Передний план (Picture-in-Picture): Локальное видео */}
            {localTrack && (
                <Box className={styles.localPipLayer}>
                    <VideoTrack
                        trackRef={localTrack}
                        className={styles.localVideo}
                    />
                </Box>
            )}
        </Box>
    );
}
