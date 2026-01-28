import { Box, Text } from '@radix-ui/themes';
import styles from './message-bubble.module.css';

interface MessageBubbleProps {
    /** Текст сообщения */
    content: string;
    /** Флаг, является ли сообщение собственным */
    isOwn: boolean;
    /** ISO строка времени создания */
    timestamp: string;
    /** Имя отправителя (для групповых чатов) */
    senderName?: string;
}

/**
 * Пузырек сообщения в стиле WhatsApp.
 * Использует CSS Modules для сложной стилизации (радиусы, тени).
 */
export function MessageBubble({
    content,
    isOwn,
    timestamp,
    senderName,
}: MessageBubbleProps) {
    // Форматируем время: "14:30"
    const timeString = new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div
            className={`${styles.bubbleWrapper} ${isOwn ? styles.own : styles.peer}`}
        >
            <Box
                className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubblePeer}`}
            >
                {!isOwn && senderName && (
                    <Text className={styles.senderName}>{senderName}</Text>
                )}

                <Text className={styles.content}>{content}</Text>

                <div className={styles.timeWrapper}>
                    <Text className={styles.time}>{timeString}</Text>
                </div>
                {/* Clearfix for float time effect inside the bubble context */}
                <div className={styles.clearfix} />
            </Box>
        </div>
    );
}
