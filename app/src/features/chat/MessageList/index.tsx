import { Flex, ScrollArea, Text } from "@radix-ui/themes";
import { useEffect, useRef } from "react";
import { useMessages } from "@/features/chat/hooks/useMessages";
import type { DecryptedMessageWithProfile } from "@/lib/types/message";
import { useAuthStore } from "@/stores/auth";
import { MessageBubble } from "../MessageBubble";
import styles from "./message-list.module.css";

interface MessageListProps {
	roomId: string;
	roomKey: CryptoKey;
}

/**
 * Компонент списка сообщений.
 * Использует useMessages для загрузки и Realtime обновлений.
 */
export function MessageList({ roomId, roomKey }: MessageListProps) {
	const { user } = useAuthStore();
	const scrollViewportRef = useRef<HTMLDivElement>(null);

	/**
	 * Загрузка сообщений через кастомный хук.
	 */
	const { data: messages = [], isLoading: loading } = useMessages(
		roomId,
		roomKey,
	);

	/**
	 * Автоматический скролл вниз.
	 */
	useEffect(() => {
		if (scrollViewportRef.current) {
			scrollViewportRef.current.scrollTop =
				scrollViewportRef.current.scrollHeight;
		}
	}, []);

	if (loading) {
		return (
			<div className={styles.loadingBox}>
				<Text color="gray">
					{user?.id ? "Загрузка сообщений..." : "Авторизация..."}
				</Text>
			</div>
		);
	}

	if (messages.length === 0) {
		return (
			<div className={styles.emptyBox}>
				<Text color="gray">Нет сообщений</Text>
			</div>
		);
	}

	return (
		<ScrollArea type="hover" className={styles.scrollArea}>
			<div className={styles.viewport} ref={scrollViewportRef}>
				<Flex direction="column" gap="2">
					{messages.map((msg: DecryptedMessageWithProfile) => (
						<MessageBubble
							key={msg.id}
							content={msg.content}
							isOwn={user?.id === msg.sender_id}
							timestamp={msg.created_at}
							senderName={msg.profiles?.display_name}
							senderAvatar={msg.profiles?.avatar_url ?? undefined}
						/>
					))}
				</Flex>
			</div>
		</ScrollArea>
	);
}
