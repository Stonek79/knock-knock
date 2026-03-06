import { Box } from "@/components/layout/Box";
import { Text } from "@/components/ui/Text";
import styles from "./transcript-block.module.css";

interface TranscriptBlockProps {
    content: string;
}

/**
 * Блок отображения транскрипции голосового сообщения.
 * Управление видимостью осуществляется из MessageBubble.
 * Текст автоматически переносится с сохранением абзацев.
 */
export function TranscriptBlock({ content }: TranscriptBlockProps) {
    return (
        <Box className={styles.transcriptContainer}>
            <Box className={styles.transcriptContent}>
                <Text className={styles.transcriptText}>{content}</Text>
            </Box>
        </Box>
    );
}
