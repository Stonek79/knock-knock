import clsx from "clsx";
import { ImageOff, Paperclip, Play } from "lucide-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { Flex } from "@/components/layout/Flex";
import { Text } from "@/components/ui/Text";
import { ATTACHMENT_TYPES } from "@/lib/constants";
import { useMedia } from "@/lib/mediadb/useMedia";
import type { Attachment } from "@/lib/types";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { AudioMessagePlayer } from "../../../AudioMessagePlayer";
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
}: {
    att: Attachment;
    index: number;
    setLightboxIndex: Dispatch<SetStateAction<number>>;
    imageErrors: Record<string, boolean>;
    setImageErrors: Dispatch<SetStateAction<Record<string, boolean>>>;
    roomKey?: CryptoKey;
    isVault?: boolean;
    userId: string;
}) {
    // Получаем оригинальный URL и URL превью
    const { objectUrl, thumbnailUrl, isLoading, error } = useMedia({
        mediaId: att.id,
        roomKey,
        isVault,
        userId,
    });
    const hasError = imageErrors[att.id] || !!error;

    // Приоритет для отображения в списке: превью (оно легче), затем оригинал
    const displayUrl = thumbnailUrl || objectUrl;

    return (
        <button
            key={att.id}
            type="button"
            className={styles.imageButton}
            onClick={(e) => {
                e.stopPropagation();
                if (!hasError && !isLoading) {
                    setLightboxIndex(index);
                }
            }}
        >
            {hasError || isLoading ? (
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
}: {
    att: Attachment;
    roomKey?: CryptoKey;
    isVault?: boolean;
    userId: string;
}) {
    const { objectUrl, thumbnailUrl, isLoading, error } = useMedia({
        mediaId: att.id,
        roomKey,
        isVault,
        userId,
    });
    const hasError = !!error;

    // Для видео в списке всегда показываем превью с кнопкой Play
    const displayUrl = thumbnailUrl || objectUrl;

    return (
        <div className={styles.videoThumbnailContainer}>
            {hasError || isLoading ? (
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
                    <img
                        src={displayUrl}
                        alt={att.file_name}
                        className={styles.attachmentImage}
                        loading="lazy"
                    />
                    <div className={styles.playOverlay}>
                        <Play size={ICON_SIZE.md} fill="currentColor" />
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Компонент для отображения документа.
 */
function CachedDocument({
    att,
    roomKey,
    isVault,
    userId,
}: {
    att: Attachment;
    roomKey?: CryptoKey;
    isVault?: boolean;
    userId: string;
}) {
    const { objectUrl, isLoading, error } = useMedia({
        mediaId: att.id,
        roomKey,
        isVault,
        userId,
    });

    return (
        <a
            key={att.id}
            href={objectUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(styles.attachmentDoc, {
                [styles.loading]: isLoading,
                [styles.error]: !!error,
            })}
            onClick={(e) => {
                if (!objectUrl) {
                    e.preventDefault();
                }
                e.stopPropagation();
            }}
            download={att.file_name}
        >
            <Paperclip size={ICON_SIZE.sm} />
            <Text size="sm">{att.file_name}</Text>
        </a>
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
}: AttachmentRendererProps) {
    const imageAttachments = useMemo(
        () => attachments.filter((a) => a.type === ATTACHMENT_TYPES.IMAGE),
        [attachments],
    );

    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

    if (!attachments || attachments.length === 0) {
        return null;
    }

    return (
        <Flex gap="1" className={styles.attachments}>
            {attachments.map((att) => {
                if (att.type === ATTACHMENT_TYPES.IMAGE) {
                    const imageIndex = imageAttachments.findIndex(
                        (i) => i.id === att.id,
                    );
                    return (
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
                        />
                    );
                }

                if (att.type === ATTACHMENT_TYPES.VIDEO) {
                    return (
                        <CachedVideo
                            key={att.id}
                            att={att}
                            roomKey={roomKey}
                            isVault={isVault}
                            userId={userId}
                        />
                    );
                }

                if (att.type === ATTACHMENT_TYPES.AUDIO) {
                    return (
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
                        />
                    );
                }

                return (
                    <CachedDocument
                        key={att.id}
                        att={att}
                        roomKey={roomKey}
                        isVault={isVault}
                        userId={userId}
                    />
                );
            })}
        </Flex>
    );
}
