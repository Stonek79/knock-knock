import { Check, X } from "lucide-react";
import { useState } from "react";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { IconButton } from "@/components/ui/IconButton";
import { TextArea } from "@/components/ui/TextArea";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./message-bubble.module.css";

interface MessageEditProps {
    initialContent: string;
    onCancel: () => void;
    onSave: (content: string) => void;
}

/**
 * Компонент редактирования сообщения.
 * Использует наши кастомные IconButton и TextArea вместо Radix.
 */
export function MessageEdit({
    initialContent,
    onCancel,
    onSave,
}: MessageEditProps) {
    const [content, setContent] = useState(initialContent);

    return (
        <Box className={styles.editBox}>
            <TextArea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={styles.editTextarea}
                rows={2}
            />
            <Flex gap="2" justify="end" mt="2">
                <IconButton size="sm" variant="ghost" onClick={onCancel}>
                    <X size={ICON_SIZE.xs} />
                </IconButton>
                <IconButton
                    size="sm"
                    variant="solid"
                    onClick={() => onSave(content)}
                >
                    <Check size={ICON_SIZE.xs} />
                </IconButton>
            </Flex>
        </Box>
    );
}
