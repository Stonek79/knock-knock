import { Avatar, Box, Text } from '@radix-ui/themes';
import { useTranslation } from 'react-i18next';
import { MESSAGE_STATUS } from '@/lib/constants/chat';
import type { MessageStatus } from '@/lib/types/message';
import { getUserColor } from '@/lib/utils/colors';
import styles from './message-bubble.module.css';
import { StatusIcon } from './StatusIcon';

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
}: MessageBubbleProps) {
    const { t } = useTranslation();

    const timeString = new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    const userColor = senderName ? getUserColor(senderName) : undefined;

    return (
        <Box
            className={`${styles.bubbleWrapper} ${isOwn ? styles.own : styles.peer} ${isSelected ? styles.selected : ''}`}
            onClick={() => {
                if (isEditing) return; // Не переключаем, если редактируем
                onToggleSelection?.();
            }}
        >
            {!isOwn && (
                <Avatar
                    size="1"
                    radius="full"
                    fallback={senderName?.[0] || '?'}
                    src={senderAvatar}
                    className={styles.avatar}
                />
            )}

            <Box
                className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubblePeer}`}
            >
                {!isOwn && senderName && (
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
                        {t('chat.messageDeleted', 'Сообщение удалено')}
                    </Text>
                ) : (
                    <Text className={styles.content}>{content}</Text>
                )}

                <Box className={styles.metadata}>
                    <Text className={styles.time}>
                        {timeString}
                        {isEdited &&
                            !isDeleted &&
                            ` • ${t('chat.edited', 'изм.')}`}
                    </Text>
                    <StatusIcon
                        status={status}
                        isOwn={isOwn}
                        isDeleted={isDeleted}
                    />
                </Box>
            </Box>
        </Box>
    );
}
