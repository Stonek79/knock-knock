import { ImageOff, Paperclip } from "lucide-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { Flex } from "@/components/layout/Flex";
import { Text } from "@/components/ui/Text";
import { ATTACHMENT_TYPES } from "@/lib/constants/storage";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import type { Attachment } from "../../services/uploadMedia";
import { AudioMessagePlayer } from "../AudioMessagePlayer";
import styles from "./message-bubble.module.css";

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
        <Flex direction="column" gap="1" className={styles.attachments}>
            {attachments.map((att) => {
                if (att.type === ATTACHMENT_TYPES.IMAGE) {
                    const imageIndex = imageAttachments.findIndex(
                        (i) => i.id === att.id,
                    );
                    return (
                        <button
                            key={att.id}
                            type="button"
                            className={styles.imageButton}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!imageErrors[att.id]) {
                                    setLightboxIndex(imageIndex);
                                }
                            }}
                        >
                            {imageErrors[att.id] ? (
                                <Flex
                                    align="center"
                                    justify="center"
                                    className={styles.imagePlaceholder}
                                >
                                    <ImageOff
                                        size={ICON_SIZE.xl}
                                        className={styles.placeholderIcon}
                                    />
                                </Flex>
                            ) : (
                                <img
                                    src={att.url}
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
