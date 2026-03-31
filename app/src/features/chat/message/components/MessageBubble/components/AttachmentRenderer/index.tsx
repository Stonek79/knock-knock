import { ImageOff, Paperclip } from "lucide-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { Flex } from "@/components/layout/Flex";
import { Text } from "@/components/ui/Text";
import { useCachedMedia } from "@/lib/cache/media";
import { ATTACHMENT_TYPES } from "@/lib/constants";
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
}

/**
 * Внутренний компонент для рендеринга изображения из кэша.
 */
function CachedImage({
    att,
    index,
    setLightboxIndex,
    imageErrors,
    setImageErrors,
}: {
    att: Attachment;
    index: number;
    setLightboxIndex: Dispatch<SetStateAction<number>>;
    imageErrors: Record<string, boolean>;
    setImageErrors: Dispatch<SetStateAction<Record<string, boolean>>>;
}) {
    const { objectUrl, isLoading, isError } = useCachedMedia(att.url);
    const hasError = imageErrors[att.id] || isError;

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
                    src={objectUrl}
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
                        />
                    );
                }

                if (att.type === ATTACHMENT_TYPES.AUDIO) {
                    return (
                        <AudioMessagePlayer
                            key={att.id}
                            src={att.url}
                            isOwn={isOwn}
                            hasTranscript={hasTranscript}
                            isTranscriptExpanded={isTranscriptExpanded}
                            onToggleTranscript={onToggleTranscript}
                            roomKey={roomKey}
                            mimeType={att.content_type}
                        />
                    );
                }

                return (
                    <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.attachmentDoc}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Paperclip size={ICON_SIZE.sm} />
                        <Text size="sm">{att.file_name}</Text>
                    </a>
                );
            })}
        </Flex>
    );
}
