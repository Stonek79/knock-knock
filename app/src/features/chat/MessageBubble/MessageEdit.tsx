import { Box, Flex, IconButton, TextArea } from "@radix-ui/themes";
import { Check, X } from "lucide-react";
import { useState } from "react";
import styles from "./message-bubble.module.css";

interface MessageEditProps {
	initialContent: string;
	onCancel: () => void;
	onSave: (content: string) => void;
}

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
				<IconButton size="1" variant="soft" color="gray" onClick={onCancel}>
					<X className={styles.iconSmall} />
				</IconButton>
				<IconButton size="1" variant="solid" onClick={() => onSave(content)}>
					<Check className={styles.iconSmall} />
				</IconButton>
			</Flex>
		</Box>
	);
}
