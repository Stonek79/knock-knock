import { Avatar, Box, Text } from "@radix-ui/themes";
import { getUserColor } from "@/lib/utils/colors";
import styles from "./message-bubble.module.css";

interface MessageBubbleProps {
	/** Текст сообщения */
	content: string;
	/** Флаг, является ли сообщение собственным */
	isOwn: boolean;
	/** ISO строка времени создания */
	timestamp: string;
	/** Имя отправителя (для групповых чатов) */
	senderName?: string;
	/** URL аватара отправителя */
	senderAvatar?: string;
}

/**
 * Пузырек сообщения в стиле WhatsApp с поддержкой аватарок и цветных имен.
 */
export function MessageBubble({
	content,
	isOwn,
	timestamp,
	senderName,
	senderAvatar,
}: MessageBubbleProps) {
	// Форматируем время: "14:30"
	const timeString = new Date(timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	// Получаем цвет Radix для имени пользователя
	const userColor = senderName ? getUserColor(senderName) : undefined;

	return (
		<div
			className={`${styles.bubbleWrapper} ${isOwn ? styles.own : styles.peer}`}
		>
			{!isOwn && (
				<div className={styles.avatarWrapper}>
					<Avatar
						size="1"
						radius="full"
						fallback={senderName?.[0] || "?"}
						src={senderAvatar}
						className={styles.avatar}
					/>
				</div>
			)}

			<Box
				className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubblePeer}`}
			>
				{!isOwn && senderName && (
					<Text className={styles.senderName} color={userColor}>
						{senderName}
					</Text>
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
