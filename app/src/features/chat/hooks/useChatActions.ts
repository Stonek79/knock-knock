import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { logger } from "@/lib/logger";
import { MessageService } from "@/lib/services/message";
import { RoomService } from "@/lib/services/room";
import type { RoomWithMembers } from "@/lib/types/room";

interface UseChatActionsProps {
	roomId?: string;
	roomKey?: CryptoKey;
	user?: { id: string } | null;
	room?: RoomWithMembers;
}

/**
 * Хук действий чата (отправка, удаление, завершение сессии).
 * Инкапсулирует вызовы RoomService/MessageService и навигацию.
 */
export function useChatActions({
	roomId,
	roomKey,
	user,
	room,
}: UseChatActionsProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [ending, setEnding] = useState(false);

	/**
	 * Отправка зашифрованного сообщения.
	 */
	const sendMessage = async (text: string) => {
		if (!roomKey || !user || !roomId) {
			logger.warn(
				"Невозможно отправить сообщение: отсутствуют ключи или ID комнаты",
			);
			return;
		}
		try {
			await MessageService.sendMessage(roomId, user.id, text, roomKey);
		} catch (e) {
			logger.error("Ошибка отправки сообщения", e);
			throw e;
		}
	};

	/**
	 * Завершение сессии чата.
	 * Очищает историю сообщений. Если чат эфемерный — удаляет комнату полностью.
	 */
	const endSession = async () => {
		if (!roomId || !user) return;

		setEnding(true);
		try {
			await MessageService.clearRoom(roomId);

			// Если чат эфемерный (временный), удаляем его полностью из базы
			if (room?.is_ephemeral) {
				logger.info(`Удаление эфемерной комнаты: ${roomId}`);
				await RoomService.deleteRoom(roomId);

				// Обновляем список комнат в кэше
				await queryClient.invalidateQueries({
					queryKey: ["rooms"],
					refetchType: "all",
				});
				logger.info(`Комната ${roomId} удалена, кэш обновлен`);
			}

			navigate({ to: "/chat" });
		} catch (e) {
			logger.error("Ошибка завершения сессии", e);
		} finally {
			setEnding(false);
		}
	};

	/**
	 * Безопасное удаление сообщения (Secure Delete).
	 * Контент затирается, помечается как удаленное.
	 */
	/**
	 * Безопасное удаление сообщения (Secure Delete).
	 */
	const deleteMessage = async (messageId: string, isOwnMessage: boolean) => {
		if (!user) return;
		try {
			await MessageService.deleteMessage(messageId, user.id, isOwnMessage);
		} catch (e) {
			logger.error("Ошибка удаления сообщения", e);
			throw e;
		}
	};

	/**
	 * Редактирование сообщения.
	 * Новый текст шифруется тем же ключом комнаты.
	 */
	const updateMessage = async (messageId: string, newContent: string) => {
		if (!roomKey) {
			logger.warn("Невозможно отредактировать: нет ключа шифрования");
			return;
		}
		try {
			await MessageService.updateMessage(messageId, newContent, roomKey);
		} catch (e) {
			logger.error("Ошибка редактирования сообщения", e);
			throw e;
		}
	};

	return {
		sendMessage,
		endSession,
		deleteMessage,
		updateMessage,
		ending,
	};
}
