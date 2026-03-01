import { Box } from "@/components/layout/Box";
import { Text } from "@/components/ui/Text";
import styles from "./message-bubble.module.css";

interface TranscriptBlockProps {
    content: string;
}

/**
 * Блок отображения транскрипции голосового сообщения.
 * Управление видимостью осуществляется из MessageBubble.
 */
export function TranscriptBlock({ content }: TranscriptBlockProps) {
    return (
        <Box className={styles.transcriptContainer}>
            <Box className={styles.transcriptContent}>
                <Text className={styles.content}>{content}</Text>
            </Box>
        </Box>
    );
}
