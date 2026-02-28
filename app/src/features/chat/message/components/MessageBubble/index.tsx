import clsx from "clsx";
import { Paperclip, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import {
    ATTACHMENT_TYPES,
    MESSAGE_POSITION,
    MESSAGE_STATUS,
} from "@/lib/constants";
import type { MessagePosition, MessageStatus } from "@/lib/types/message";
import { getUserColor } from "@/lib/utils/colors";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import type { Attachment } from "../../services/uploadMedia";
import styles from "./message-bubble.module.css";
import { StatusIcon } from "./StatusIcon";

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
}

/**
 * Пузырь сообщения в чате.
 * Использует наш Avatar вместо Radix Avatar, нативные span вместо Radix Text.
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
}: MessageBubbleProps) {
    const { t } = useTranslation();

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
                    {attachments && attachments.length > 0 && (
                        <Flex
                            direction="column"
                            gap="1"
                            className={styles.attachments}
                        >
                            {attachments.map((att) => {
                                if (att.type === ATTACHMENT_TYPES.IMAGE) {
                                    return (
                                        <img
                                            key={att.id}
                                            src={att.url}
                                            alt={att.file_name}
                                            className={styles.attachmentImage}
                                            loading="lazy"
                                        />
                                    );
                                }
                                if (att.type === ATTACHMENT_TYPES.AUDIO) {
                                    return (
                                        <audio
                                            key={att.id}
                                            src={att.url}
                                            controls
                                            className={styles.attachmentAudio}
                                        >
                                            <track kind="captions" />
                                        </audio>
                                    );
                                }
                                return (
                                    <a
                                        key={att.id}
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.attachmentDoc}
                                    >
                                        <Paperclip size={ICON_SIZE.sm} />
                                        <Text size="sm">{att.file_name}</Text>
                                    </a>
                                );
                            })}
                        </Flex>
                    )}

                    {isDeleted ? (
                        <Text className={styles.deletedContent}>
                            {t("chat.messageDeleted", "Сообщение удалено")}
                        </Text>
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
        </Flex>
    );
}
