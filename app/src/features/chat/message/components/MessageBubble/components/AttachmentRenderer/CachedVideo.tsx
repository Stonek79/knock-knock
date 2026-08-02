import clsx from "clsx";
import { Loader2, Play } from "lucide-react";
import {
    type Dispatch,
    type MouseEvent,
    type SetStateAction,
    useEffect,
    useRef,
    useState,
} from "react";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import {
    ICON_SIZE,
    MEDIA_SYSTEM_CONSTANTS,
    OPTIMISTIC_ID_PREFIX,
} from "@/lib/constants";
import { useMedia } from "@/lib/mediadb/useMedia";
import { mediaService } from "@/lib/services/media";
import type { Attachment } from "@/lib/types";
import styles from "./attachment-renderer.module.css";
import { getRatioClass } from "./helpers";

interface CachedVideoProps {
    att: Attachment;
    index: number;
    setLightboxIndex: Dispatch<SetStateAction<number>>;
    roomKey?: CryptoKey;
    isVault?: boolean;
    userId: string;
    onErrorStateChange?: (id: string, hasError: boolean) => void;
    isFailed?: boolean;
    isSingle: boolean;
    isSystem?: boolean;
}

export function CachedVideo({
    att,
    index,
    setLightboxIndex,
    roomKey,
    isVault,
    userId,
    onErrorStateChange,
    isFailed,
    isSingle,
    isSystem,
}: CachedVideoProps) {
    const { objectUrl, thumbnailUrl, isLoading, error, metadata } = useMedia({
        mediaId: isSystem ? undefined : att.id,
        roomKey,
        isVault,
        userId,
        initialUrl: att.url,
        downloadOriginal: true,
    });

    useEffect(() => {
        onErrorStateChange?.(att.id, !!error);
    }, [att.id, error, onErrorStateChange]);

    const isBlob =
        typeof att.url === "string" &&
        att.url.startsWith(MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX);
    const systemUrl = isSystem
        ? mediaService.getSystemFileUrl(att.id, att.file_name)
        : undefined;
    const displayUrl = isBlob ? att.url : systemUrl || objectUrl;

    const isVideoLoading =
        (isLoading || att.id.startsWith(OPTIMISTIC_ID_PREFIX)) && !isFailed;
    const showPlaceholder =
        !displayUrl && !thumbnailUrl && (!!error || isLoading);

    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !displayUrl) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    video.muted = true;
                    video.play().catch((err) => {
                        console.debug("Autoplay blocked or interrupted:", err);
                    });
                } else {
                    video.pause();
                }
            },
            { threshold: 0.5 },
        );

        observer.observe(video);

        return () => {
            observer.unobserve(video);
        };
    }, [displayUrl]);

    const ratioClass = getRatioClass(isSingle, metadata);

    const handleButtonClick = (e: MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        if (!showPlaceholder && !isVideoLoading) {
            setLightboxIndex(index);
        }
    };

    const handlePlay = () => {
        setIsPlaying(true);
    };

    const handlePause = () => {
        setIsPlaying(false);
    };

    return (
        <Button
            asChild
            variant="ghost"
            type="button"
            className={clsx(styles.videoThumbnailContainer, ratioClass)}
            onClick={handleButtonClick}
        >
            <button type="button">
                {showPlaceholder ? (
                    <Flex
                        align="center"
                        justify="center"
                        className={clsx(styles.imagePlaceholder, ratioClass)}
                    >
                        <Play
                            size={ICON_SIZE.lg}
                            className={styles.placeholderIcon}
                        />
                    </Flex>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            src={
                                displayUrl
                                    ? thumbnailUrl
                                        ? displayUrl
                                        : `${displayUrl}#t=0.001`
                                    : undefined
                            }
                            poster={thumbnailUrl || undefined}
                            className={styles.attachmentImage}
                            muted
                            playsInline
                            loop
                            preload="metadata"
                            onPlay={handlePlay}
                            onPause={handlePause}
                        />
                        {isVideoLoading ? (
                            <Box className={styles.loadingOverlay}>
                                <Loader2
                                    size={ICON_SIZE.md}
                                    className={styles.spinner}
                                />
                            </Box>
                        ) : !isPlaying ? (
                            <Box className={styles.playOverlay}>
                                <Play size={ICON_SIZE.md} fill="currentColor" />
                            </Box>
                        ) : null}
                    </>
                )}
            </button>
        </Button>
    );
}
