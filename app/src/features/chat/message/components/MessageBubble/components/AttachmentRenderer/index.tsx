import clsx from "clsx";
import { ImageOff, Loader2, Play } from "lucide-react";
import {
    type Dispatch,
    type ReactNode,
    type SetStateAction,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Flex } from "@/components/layout/Flex";
import {
    ATTACHMENT_TYPES,
    ICON_SIZE,
    MEDIA_SYSTEM_CONSTANTS,
    OPTIMISTIC_ID_PREFIX,
} from "@/lib/constants";
import { useMedia } from "@/lib/mediadb/useMedia";
import type { Attachment } from "@/lib/types";
import { AudioMessagePlayer } from "../../../AudioMessagePlayer";
import { DocumentAttachmentCard } from "../DocumentAttachmentCard";
import styles from "./attachment-renderer.module.css";

interface AttachmentRendererProps {
    attachments: Attachment[];
    setLightboxIndex: Dispatch<SetStateAction<number>>;
    isOwn: boolean;
    hasTranscript?: boolean;
    isTranscriptExpanded?: boolean;
    onToggleTranscript?: () => void;
    roomKey?: CryptoKey;
    isVault?: boolean;
    userId: string;
    onMediaError?: (hasError: boolean) => void;
    isFailed?: boolean;
}

/**
 * Функция для вычисления класса пропорций на основе метаданных медиафайла.
 */
function getRatioClass(
    isSingle: boolean,
    metadata?: { width?: number; height?: number } | null,
): string {
    if (!isSingle || !metadata?.width || !metadata?.height) {
        return "";
    }
    const ratio = metadata.width / metadata.height;
    if (ratio <= 0.6) {
        return styles.ratio_1_2;
    }
    if (ratio <= 0.7) {
        return styles.ratio_2_3;
    }
    if (ratio <= 0.85) {
        return styles.ratio_3_4;
    }
    if (ratio <= 1.15) {
        return styles.ratio_1_1;
    }
    if (ratio <= 1.4) {
        return styles.ratio_4_3;
    }
    if (ratio <= 1.6) {
        return styles.ratio_3_2;
    }
    if (ratio <= 1.85) {
        return styles.ratio_16_9;
    }
    return styles.ratio_2_1;
}

/**
 * Внутренний компонент для рендеринга изображения с поддержкой превью.
 */
function CachedImage({
    att,
    index,
    setLightboxIndex,
    imageErrors,
    setImageErrors,
    roomKey,
    isVault,
    userId,
    onErrorStateChange,
    isSingle,
}: {
    att: Attachment;
    index: number;
    setLightboxIndex: Dispatch<SetStateAction<number>>;
    imageErrors: Record<string, boolean>;
    setImageErrors: Dispatch<SetStateAction<Record<string, boolean>>>;
    roomKey?: CryptoKey;
    isVault?: boolean;
    userId: string;
    onErrorStateChange?: (id: string, hasError: boolean) => void;
    isSingle: boolean;
}) {
    // Получаем оригинальный URL, URL превью и метаданные
    const { objectUrl, thumbnailUrl, isLoading, error, metadata } = useMedia({
        mediaId: att.id,
        roomKey,
        isVault,
        userId,
        initialUrl: att.url,
    });

    useEffect(() => {
        onErrorStateChange?.(att.id, !!error);
    }, [att.id, error, onErrorStateChange]);

    // Если это наша локальная оптимистичная blob-ссылка, то принудительно используем её.
    const isBlob =
        typeof att.url === "string" &&
        att.url.startsWith(MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX);
    const displayUrl = isBlob ? att.url : thumbnailUrl || objectUrl;

    const showPlaceholder =
        !displayUrl && (imageErrors[att.id] || !!error || isLoading);

    const ratioClass = getRatioClass(isSingle, metadata);

    return (
        <button
            key={att.id}
            type="button"
            className={clsx(styles.imageButton, ratioClass)}
            onClick={(e) => {
                e.stopPropagation();
                if (!showPlaceholder) {
                    setLightboxIndex(index);
                }
            }}
        >
            {showPlaceholder ? (
                <Flex
                    align="center"
                    justify="center"
                    className={clsx(styles.imagePlaceholder, ratioClass)}
                >
                    <ImageOff
                        size={ICON_SIZE.lg}
                        className={styles.placeholderIcon}
                    />
                </Flex>
            ) : (
                <img
                    src={displayUrl}
                    alt={att.file_name}
                    className={styles.attachmentImage}
                    loading="lazy"
                    onError={() =>
                        setImageErrors((prev) => ({
                            ...prev,
                            [att.id]: true,
                        }))
                    }
                />
            )}
        </button>
    );
}

/**
 * Компонент для отображения превью видео.
 */
function CachedVideo({
    att,
    index,
    setLightboxIndex,
    roomKey,
    isVault,
    userId,
    onErrorStateChange,
    isFailed,
    isSingle,
}: {
    att: Attachment;
    index: number;
    setLightboxIndex: Dispatch<SetStateAction<number>>;
    roomKey?: CryptoKey;
    isVault?: boolean;
    userId: string;
    onErrorStateChange?: (id: string, hasError: boolean) => void;
    isFailed?: boolean;
    isSingle: boolean;
}) {
    const { objectUrl, thumbnailUrl, isLoading, error, metadata } = useMedia({
        mediaId: att.id,
        roomKey,
        isVault,
        userId,
        initialUrl: att.url,
        downloadOriginal: true,
    });

    useEffect(() => {
        onErrorStateChange?.(att.id, !!error);
    }, [att.id, error, onErrorStateChange]);

    // Оптимистичный локальный blob-урл в приоритете
    const isBlob =
        typeof att.url === "string" &&
        att.url.startsWith(MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX);
    const displayUrl = isBlob ? att.url : objectUrl;

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

    return (
        <button
            type="button"
            className={clsx(styles.videoThumbnailContainer, ratioClass)}
            onClick={(e) => {
                e.stopPropagation();
                if (!showPlaceholder && !isVideoLoading) {
                    setLightboxIndex(index);
                }
            }}
        >
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
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                    />
                    {isVideoLoading ? (
                        <div className={styles.loadingOverlay}>
                            <Loader2
                                size={ICON_SIZE.md}
                                className={styles.spinner}
                            />
                        </div>
                    ) : !isPlaying ? (
                        <div className={styles.playOverlay}>
                            <Play size={ICON_SIZE.md} fill="currentColor" />
                        </div>
                    ) : null}
                </>
            )}
        </button>
    );
}

/**
 * Компонент рендера вложений сообщения.
 */
export function AttachmentRenderer({
    attachments,
    setLightboxIndex,
    isOwn,
    hasTranscript,
    isTranscriptExpanded,
    onToggleTranscript,
    roomKey,
    isVault,
    userId,
    onMediaError,
    isFailed = false,
}: AttachmentRendererProps) {
    const mediaAttachments = useMemo(
        () =>
            attachments.filter(
                (a) =>
                    a.type === ATTACHMENT_TYPES.IMAGE ||
                    a.type === ATTACHMENT_TYPES.VIDEO,
            ),
        [attachments],
    );

    const audioAttachments = useMemo(
        () => attachments.filter((a) => a.type === ATTACHMENT_TYPES.AUDIO),
        [attachments],
    );

    const docAttachments = useMemo(
        () =>
            attachments.filter(
                (a) =>
                    a.type !== ATTACHMENT_TYPES.IMAGE &&
                    a.type !== ATTACHMENT_TYPES.VIDEO &&
                    a.type !== ATTACHMENT_TYPES.AUDIO,
            ),
        [attachments],
    );

    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    const [mediaErrorsState, setMediaErrorsState] = useState<
        Record<string, boolean>
    >({});

    useEffect(() => {
        const hasAnyError = Object.values(mediaErrorsState).some(Boolean);
        onMediaError?.(hasAnyError);
    }, [mediaErrorsState, onMediaError]);

    const handleMediaErrorStateChange = useCallback(
        (id: string, hasError: boolean) => {
            setMediaErrorsState((prev) => {
                if (prev[id] === hasError) {
                    return prev;
                }

                return { ...prev, [id]: hasError };
            });
        },
        [],
    );

    if (!attachments || attachments.length === 0) {
        return null;
    }

    const renderMediaGallery = () => {
        if (mediaAttachments.length === 0) {
            return null;
        }

        const count = mediaAttachments.length;
        const isSingle = count === 1;
        const displayCount = count > 4 ? "many" : count.toString();
        const visibleMedia = mediaAttachments.slice(0, 4);
        const hiddenCount = count - 4;

        return (
            <div className={styles.mediaGallery} data-count={displayCount}>
                {visibleMedia.map((att, idx) => {
                    const isImage = att.type === ATTACHMENT_TYPES.IMAGE;
                    const isLast = idx === 3;

                    let content: ReactNode;
                    const mediaIndex = mediaAttachments.findIndex(
                        (m) => m.id === att.id,
                    );
                    if (isImage) {
                        content = (
                            <CachedImage
                                key={att.id}
                                att={att}
                                index={mediaIndex}
                                setLightboxIndex={setLightboxIndex}
                                imageErrors={imageErrors}
                                setImageErrors={setImageErrors}
                                roomKey={roomKey}
                                isVault={isVault}
                                userId={userId}
                                onErrorStateChange={handleMediaErrorStateChange}
                                isSingle={isSingle}
                            />
                        );
                    } else {
                        content = (
                            <CachedVideo
                                key={att.id}
                                att={att}
                                index={mediaIndex}
                                setLightboxIndex={setLightboxIndex}
                                roomKey={roomKey}
                                isVault={isVault}
                                userId={userId}
                                onErrorStateChange={handleMediaErrorStateChange}
                                isFailed={isFailed}
                                isSingle={isSingle}
                            />
                        );
                    }

                    if (isLast && hiddenCount > 0) {
                        return (
                            <div
                                key={att.id}
                                className={styles.moreOverlayWrapper}
                            >
                                {content}
                                <div className={styles.moreOverlay}>
                                    +{hiddenCount}
                                </div>
                            </div>
                        );
                    }

                    return content;
                })}
            </div>
        );
    };

    return (
        <Flex direction="column" gap="1" className={styles.attachments}>
            {renderMediaGallery()}
            {audioAttachments.map((att) => (
                <AudioMessagePlayer
                    key={att.id}
                    mediaId={att.id}
                    isOwn={isOwn}
                    hasTranscript={hasTranscript}
                    isTranscriptExpanded={isTranscriptExpanded}
                    onToggleTranscript={onToggleTranscript}
                    roomKey={roomKey}
                    mimeType={att.content_type}
                    userId={userId}
                    initialUrl={att.url}
                />
            ))}
            {docAttachments.map((att) => (
                <DocumentAttachmentCard
                    key={att.id}
                    attachment={att}
                    userId={userId}
                    roomKey={roomKey}
                    isVault={isVault}
                />
            ))}
        </Flex>
    );
}
