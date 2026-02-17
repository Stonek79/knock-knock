import { Avatar, Box, Text } from "@radix-ui/themes";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MESSAGE_POSITION, MESSAGE_STATUS } from "@/lib/constants";
import type { MessagePosition, MessageStatus } from "@/lib/types/message";
import { getUserColor } from "@/lib/utils/colors";
import { MessageActions } from "./MessageActions";
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
    onToggleStar?: (isStarred: boolean) => void;
    groupPosition?: MessagePosition;
}

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
    onToggleStar,
    groupPosition = MESSAGE_POSITION.SINGLE,
}: MessageBubbleProps) {
    const { t } = useTranslation();

    const timeString = new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    const userColor = senderName ? getUserColor(senderName) : undefined;

    return (
        <Box
            className={`${styles.bubbleWrapper} ${isOwn ? styles.own : styles.peer} ${isSelected ? styles.selected : ""}`}
            data-group-position={groupPosition}
            onClick={() => {
                if (isEditing) {
                    return; // Не переключаем, если редактируем
                }
                onToggleSelection?.();
            }}
        >
            {!isOwn && (
                <div className={styles.avatarContainer}>
                    {groupPosition === MESSAGE_POSITION.SINGLE ||
                    groupPosition === MESSAGE_POSITION.END ? (
                        <Avatar
                            size="1"
                            radius="full"
                            fallback={senderName?.[0] || "?"}
                            src={senderAvatar}
                            className={styles.avatar}
                            color="gray"
                            variant="soft"
                        />
                    ) : (
                        <div className={styles.avatarPlaceholder} />
                    )}
                </div>
            )}

            <Box
                className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubblePeer}`}
            >
                {!isOwn &&
                    senderName &&
                    (groupPosition === MESSAGE_POSITION.SINGLE ||
                        groupPosition === MESSAGE_POSITION.START) && (
                        <Text
                            weight="bold"
                            size="1"
                            color={userColor}
                            className={styles.senderName}
                        >
                            {senderName}
                        </Text>
                    )}

                {isDeleted ? (
                    <Text className={styles.deletedContent}>
                        {t("chat.messageDeleted", "Сообщение удалено")}
                    </Text>
                ) : (
                    <Text className={styles.content}>{content}</Text>
                )}

                <Box className={styles.metadata}>
                    {isStarred && <Star size={12} className={styles.star} />}
                    <Text className={styles.time}>
                        {timeString}
                        {isEdited &&
                            !isDeleted &&
                            ` • ${t("chat.edited", "изм.")}`}
                    </Text>
                    <StatusIcon
                        status={status}
                        isOwn={isOwn}
                        isDeleted={isDeleted}
                    />
                </Box>
                {!isDeleted && (
                    <MessageActions
                        isOwn={isOwn}
                        isStarred={isStarred}
                        isEditing={isEditing}
                        onEdit={() => {}} // Handle in MessageList
                        onDelete={() => {}} // Handle in MessageList
                        onToggleStar={onToggleStar}
                    />
                )}
            </Box>
        </Box>
    );
}
