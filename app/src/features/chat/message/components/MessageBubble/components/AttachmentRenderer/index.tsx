import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { ATTACHMENT_TYPES } from "@/lib/constants";
import type { Attachment } from "@/lib/types";
import { AudioMessagePlayer } from "../../../AudioMessagePlayer";
import { DocumentAttachmentCard } from "../DocumentAttachmentCard";
import styles from "./attachment-renderer.module.css";
import { CachedImage } from "./CachedImage";
import { CachedVideo } from "./CachedVideo";

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
    isSystem?: boolean;
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
    isSystem = false,
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
            <Box className={styles.mediaGallery} data-count={displayCount}>
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
                                isSystem={isSystem}
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
                                isSystem={isSystem}
                            />
                        );
                    }

                    if (isLast && hiddenCount > 0) {
                        return (
                            <Box
                                key={att.id}
                                className={styles.moreOverlayWrapper}
                            >
                                {content}
                                <Box className={styles.moreOverlay}>
                                    +{hiddenCount}
                                </Box>
                            </Box>
                        );
                    }

                    return content;
                })}
            </Box>
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
