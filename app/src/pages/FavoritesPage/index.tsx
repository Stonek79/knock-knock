import { Box, Flex, Spinner, Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChatRoom } from "@/features/chat/ChatRoom";
import { ChatService } from "@/lib/services/chat";
import { useAuthStore } from "@/stores/auth";
import styles from "./favoritespage.module.css";

/**
 * Страница избранного.
 * Автоматически открывает (или создает) чат с самим собой.
 */
export function FavoritesPage() {
	const { t } = useTranslation();
	const { user } = useAuthStore();

	// Загружаем ID комнаты для "Избранного" (чат с самим собой)
	const {
		data: roomId,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["favorites", user?.id],
		queryFn: async () => {
			if (!user) throw new Error("Unauthorized");
			// Находим или создаем чат с самим собой (targetUserId = currentUserId)
			return ChatService.findOrCreateDM(user.id, user.id);
		},
		enabled: !!user,
	});

	if (isLoading) {
		return (
			<Flex align="center" justify="center" flexGrow="1">
				<Spinner size="3" />
			</Flex>
		);
	}

	if (error || !roomId) {
		return (
			<Flex
				align="center"
				justify="center"
				flexGrow="1"
				direction="column"
				gap="2"
			>
				<Text color="red">
					{t("common.error", "Ошибка")}:{" "}
					{error instanceof Error ? error.message : "Unknown error"}
				</Text>
			</Flex>
		);
	}

	// Рендерим комнату чата
	return (
		<Box className={styles.container}>
			<ChatRoom roomId={roomId} />
		</Box>
	);
}
