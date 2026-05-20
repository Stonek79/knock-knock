import { ImageOff, Play } from "lucide-react";
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
import { Button } from "@/components/ui/Button";
import {
    ATTACHMENT_TYPES,
    ICON_SIZE,
    MEDIA_SYSTEM_CONSTANTS,
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
}) {
    // Получаем оригинальный URL и URL превью
    const { objectUrl, thumbnailUrl, isLoading, error } = useMedia({
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

    return (
        <button
            key={att.id}
            type="button"
            className={styles.imageButton}
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
                    className={styles.imagePlaceholder}
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
    roomKey,
    isVault,
    userId,
    onErrorStateChange,
}: {
    att: Attachment;
    roomKey?: CryptoKey;
    isVault?: boolean;
    userId: string;
    onErrorStateChange?: (id: string, hasError: boolean) => void;
}) {
    const { objectUrl, thumbnailUrl, isLoading, error } = useMedia({
        mediaId: att.id,
        roomKey,
        isVault,
        userId,
        initialUrl: att.url,
    });

    useEffect(() => {
        onErrorStateChange?.(att.id, !!error);
    }, [att.id, error, onErrorStateChange]);

    // Оптимистичный локальный blob-урл в приоритете
    const isBlob =
        typeof att.url === "string" &&
        att.url.startsWith(MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX);
    const displayUrl = isBlob ? att.url : thumbnailUrl || objectUrl;

    // Если мы используем сам видеофайл (оптимистичный blob или скачанный objectUrl),
    // браузер не покажет его в теге <img>. Обязательно используем <video>.
    const renderAsVideo = !!displayUrl && displayUrl !== thumbnailUrl;

    const showPlaceholder = !displayUrl && (!!error || isLoading);

    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlay = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.play().catch(console.error);
            setIsPlaying(true);
        }
    }, []);

    return (
        <Button
            className={styles.videoThumbnailContainer}
            onClick={renderAsVideo && !isPlaying ? handlePlay : undefined}
        >
            {showPlaceholder ? (
                <Flex
                    align="center"
                    justify="center"
                    className={styles.imagePlaceholder}
                >
                    <Play
                        size={ICON_SIZE.lg}
                        className={styles.placeholderIcon}
                    />
                </Flex>
            ) : (
                <>
                    {renderAsVideo ? (
                        <video
                            ref={videoRef}
                            src={displayUrl}
                            className={styles.attachmentImage}
                            controls={isPlaying}
                            muted={!isPlaying}
                            playsInline
                            preload="metadata"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => setIsPlaying(false)}
                        />
                    ) : (
                        <img
                            src={displayUrl}
                            alt={att.file_name}
                            className={styles.attachmentImage}
                            loading="lazy"
                        />
                    )}
                    {!isPlaying && (
                        <div className={styles.playOverlay}>
                            <Play size={ICON_SIZE.md} fill="currentColor" />
                        </div>
                    )}
                </>
            )}
        </Button>
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
}: AttachmentRendererProps) {
    const imageAttachments = useMemo(
        () => attachments.filter((a) => a.type === ATTACHMENT_TYPES.IMAGE),
        [attachments],
    );

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
        const displayCount = count > 4 ? "many" : count.toString();
        const visibleMedia = mediaAttachments.slice(0, 4);
        const hiddenCount = count - 4;

        return (
            <div className={styles.mediaGallery} data-count={displayCount}>
                {visibleMedia.map((att, idx) => {
                    const isImage = att.type === ATTACHMENT_TYPES.IMAGE;
                    const isLast = idx === 3;

                    let content: ReactNode;
                    if (isImage) {
                        const imageIndex = imageAttachments.findIndex(
                            (i) => i.id === att.id,
                        );
                        content = (
                            <CachedImage
                                key={att.id}
                                att={att}
                                index={imageIndex}
                                setLightboxIndex={setLightboxIndex}
                                imageErrors={imageErrors}
                                setImageErrors={setImageErrors}
                                roomKey={roomKey}
                                isVault={isVault}
                                userId={userId}
                                onErrorStateChange={handleMediaErrorStateChange}
                            />
                        );
                    } else {
                        content = (
                            <CachedVideo
                                key={att.id}
                                att={att}
                                roomKey={roomKey}
                                isVault={isVault}
                                userId={userId}
                                onErrorStateChange={handleMediaErrorStateChange}
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
