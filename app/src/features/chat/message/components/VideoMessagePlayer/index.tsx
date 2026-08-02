import { Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { IconButton } from "@/components/ui/IconButton";
import { useMedia } from "@/lib/mediadb/useMedia";
import type { Attachment } from "@/lib/types";
import styles from "./video-message-player.module.css";

interface VideoMessagePlayerProps {
    attachment: Attachment;
    roomKey?: CryptoKey;
    userId: string;
    onError?: (error: Error) => void;
}

export function VideoMessagePlayer({
    attachment,
    roomKey,
    userId,
    onError,
}: VideoMessagePlayerProps) {
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    const {
        objectUrl: url,
        isLoading,
        error,
    } = useMedia({
        mediaId: attachment.id,
        roomKey,
        userId,
        initialUrl: attachment.url,
        downloadOriginal: true,
    });

    useEffect(() => {
        if (error && onError) {
            onError(error);
        }
    }, [error, onError]);

    const handleTogglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoRef.current) {
            return;
        }

        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            // Размутируем при клике
            if (isMuted) {
                videoRef.current.muted = false;
                setIsMuted(false);
            }
            videoRef.current.play().catch(console.error);
            setIsPlaying(true);
        }
    };

    const handleEnded = useCallback(() => {
        setIsPlaying(false);
    }, []);

    const handlePlay = useCallback(() => {
        setIsPlaying(true);
    }, []);

    const handlePause = useCallback(() => {
        setIsPlaying(false);
    }, []);

    return (
        <Box className={styles.container}>
            {isLoading ? (
                <Flex align="center" justify="center" className={styles.loader}>
                    <Box className={styles.spinner} />
                </Flex>
            ) : url ? (
                <>
                    <video
                        ref={videoRef}
                        src={url}
                        className={styles.video}
                        playsInline
                        loop
                        muted={isMuted}
                        onClick={handleTogglePlay}
                        onEnded={handleEnded}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        autoPlay
                    />
                    {!isPlaying && (
                        <IconButton
                            className={styles.playButton}
                            onClick={handleTogglePlay}
                            size="md"
                            shape="round"
                            variant="ghost"
                        >
                            <Play fill="currentColor" size={24} />
                        </IconButton>
                    )}
                </>
            ) : (
                <Flex align="center" justify="center" className={styles.error}>
                    {t("common.error")}
                </Flex>
            )}
        </Box>
    );
}
