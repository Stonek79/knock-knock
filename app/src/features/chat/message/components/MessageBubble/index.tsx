import clsx from "clsx";
import { Star } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import { MESSAGE_POSITION, MESSAGE_STATUS } from "@/lib/constants";
import { ATTACHMENT_TYPES } from "@/lib/constants/storage";
import type { MessagePosition, MessageStatus } from "@/lib/types/message";
import { getUserColor } from "@/lib/utils/colors";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import type { Attachment } from "../../services/uploadMedia";
import { AttachmentRenderer } from "./AttachmentRenderer";
import styles from "./message-bubble.module.css";
import { StatusIcon } from "./StatusIcon";
import { TranscriptBlock } from "./TranscriptBlock";

// TODO: большой и сложный компонент, разбить на мелкие, импортируемые компоненты разбить по подпапкам с собственными модулями стилей
// так как сейчас модуль общий, большой и сложный, в нем много стилей, которые не используются в других местах

interface MessageBubbleProps {
    content: string | null;
    isOwn: boolean;
    timestamp: string;
    senderName?: string;
    senderAvatar?: string;
    status?: MessageStatus;
    isEdited?: boolean;
    isDeleted?: boolean;
    isSelected?: boolean;
    onToggleSelection?: () => void;
    isEditing?: boolean;
    isStarred?: boolean;
    groupPosition?: MessagePosition;
    attachments?: Attachment[] | null;
    roomKey?: CryptoKey;
}

/**
 * Пузырь сообщения в чате.
 */
export function MessageBubble({
    content,
    isOwn,
    timestamp,
    senderName,
    senderAvatar,
    status = MESSAGE_STATUS.SENT,
    isEdited = false,
    isDeleted = false,
    isSelected = false,
    onToggleSelection,
    isEditing = false,
    isStarred = false,
    groupPosition = MESSAGE_POSITION.SINGLE,
    attachments = null,
    roomKey,
}: MessageBubbleProps) {
    const { t } = useTranslation();
    const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
    const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

    const hasAudioAttachment = attachments?.some(
        (a) => a.type === ATTACHMENT_TYPES.AUDIO,
    );
    const imageAttachments =
        attachments?.filter((a) => a.type === ATTACHMENT_TYPES.IMAGE) || [];

    const timeString = new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    const userColor = senderName ? getUserColor(senderName) : undefined;

    const wrapper = clsx(styles.bubbleWrapper, {
        [styles.own]: isOwn,
        [styles.peer]: !isOwn,
        [styles.selected]: isSelected,
    });

    const bubble = clsx(styles.bubble, {
        [styles.bubbleOwn]: isOwn,
        [styles.bubblePeer]: !isOwn,
    });

    return (
        <Flex
            className={wrapper}
            data-group-position={groupPosition}
            onClick={() => {
                if (isEditing) {
                    return;
                }
                onToggleSelection?.();
            }}
        >
            {!isOwn && (
                <Box className={styles.avatarContainer}>
                    {groupPosition === MESSAGE_POSITION.SINGLE ||
                    groupPosition === MESSAGE_POSITION.END ? (
                        <Avatar
                            fallback={senderName?.[0] || "?"}
                            src={senderAvatar}
                            name={senderName}
                        />
                    ) : (
                        <Box className={styles.avatarPlaceholder} />
                    )}
                </Box>
            )}

            <Flex justify="between" className={bubble}>
                {!isOwn &&
                    senderName &&
                    (groupPosition === MESSAGE_POSITION.SINGLE ||
                        groupPosition === MESSAGE_POSITION.START) && (
                        <span
                            className={styles.senderName}
                            style={{ color: userColor }}
                        >
                            {senderName}
                        </span>
                    )}
                <Flex direction="column" gap="1">
                    <AttachmentRenderer
                        attachments={attachments || []}
                        setLightboxIndex={setLightboxIndex}
                        isOwn={isOwn}
                        hasTranscript={!!content && hasAudioAttachment}
                        isTranscriptExpanded={isTranscriptExpanded}
                        onToggleTranscript={() =>
                            setIsTranscriptExpanded((prev) => !prev)
                        }
                        roomKey={roomKey}
                    />

                    {isDeleted ? (
                        <Text className={styles.deletedContent}>
                            {t("chat.messageDeleted", "Сообщение удалено")}
                        </Text>
                    ) : content && hasAudioAttachment ? (
                        isTranscriptExpanded ? (
                            <TranscriptBlock content={content} />
                        ) : null
                    ) : content ? (
                        <Text className={styles.content}>{content}</Text>
                    ) : null}

                    <Box className={styles.metadata}>
                        {isStarred && (
                            <Star size={ICON_SIZE.xs} className={styles.star} />
                        )}
                        <span className={styles.time}>
                            {timeString}
                            {isEdited &&
                                !isDeleted &&
                                ` • ${t("chat.edited", "изм.")}`}
                        </span>
                        <StatusIcon
                            status={status}
                            isOwn={isOwn}
                            isDeleted={isDeleted}
                        />
                    </Box>
                </Flex>
            </Flex>

            {imageAttachments.length > 0 && (
                <Lightbox
                    open={lightboxIndex >= 0}
                    close={() => setLightboxIndex(-1)}
                    index={lightboxIndex}
                    slides={imageAttachments.map((img) => ({ src: img.url }))}
                    plugins={[Zoom]}
                    carousel={{ finite: imageAttachments.length === 1 }}
                    render={{
                        buttonPrev:
                            imageAttachments.length <= 1
                                ? () => null
                                : undefined,
                        buttonNext:
                            imageAttachments.length <= 1
                                ? () => null
                                : undefined,
                    }}
                />
            )}
        </Flex>
    );
}
