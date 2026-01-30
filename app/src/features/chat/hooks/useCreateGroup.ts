import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { MOCK_GROUP_AVATARS } from "@/lib/mock/data";
import { ChatService } from "@/lib/services/chat";
import { useAuthStore } from "@/stores/auth";

interface UseCreateGroupProps {
	onOpenChange: (open: boolean) => void;
}

/**
 * Хук логики создания группы.
 * Управляет состоянием формы, выбором участников и отправкой API запроса.
 */
export function useCreateGroup({ onOpenChange }: UseCreateGroupProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user } = useAuthStore();

	const [groupName, setGroupName] = useState("");
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [isCreating, setIsCreating] = useState(false);

	/**
	 * Сброс формы
	 */
	const resetState = useCallback(() => {
		setGroupName("");
		setSelectedIds([]);
		setAvatarUrl(null);
	}, []);

	/**
	 * Симуляция выбора аватара
	 */
	const handleAvatarClick = useCallback(() => {
		const random =
			MOCK_GROUP_AVATARS[Math.floor(Math.random() * MOCK_GROUP_AVATARS.length)];
		setAvatarUrl(random);
	}, []);

	/**
	 * Создание группы
	 */
	const handleCreateGroup = useCallback(async () => {
		if (selectedIds.length < 2 || !groupName.trim() || !user) return;

		setIsCreating(true);
		try {
			const { roomId } = await ChatService.createRoom(
				groupName.trim(),
				"group",
				user.id,
				selectedIds,
				false, // Групповые чаты обычно не эфемерные
				avatarUrl,
			);

			// Инвалидируем кеш списка комнат
			await queryClient.invalidateQueries({
				queryKey: ["rooms"],
				refetchType: "all",
			});

			// Закрываем диалог и переходим в чат
			onOpenChange(false);
			resetState();

			navigate({
				to: "/chat/$roomId",
				params: { roomId },
			});
		} catch (error) {
			console.error("Failed to create group:", error);
		} finally {
			setIsCreating(false);
		}
	}, [
		selectedIds,
		groupName,
		user,
		queryClient,
		onOpenChange,
		navigate,
		avatarUrl,
		resetState,
	]);

	/**
	 * Удаление участника
	 */
	const removeParticipant = useCallback((id: string) => {
		setSelectedIds((prev) => prev.filter((pid) => pid !== id));
	}, []);

	/**
	 * Обёртка для onOpenChange с сбросом состояния
	 */
	const handleOpenChange = useCallback(
		(newOpen: boolean) => {
			if (!newOpen) {
				resetState();
			}
			onOpenChange(newOpen);
		},
		[onOpenChange, resetState],
	);

	// Минимум 2 участника для группы (помимо создателя)
	const canCreate = selectedIds.length >= 2 && groupName.trim().length > 0;

	return {
		groupName,
		setGroupName,
		avatarUrl,
		handleAvatarClick,
		selectedIds,
		setSelectedIds,
		isCreating,
		handleCreateGroup,
		removeParticipant,
		handleOpenChange,
		canCreate,
	};
}
