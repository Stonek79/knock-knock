import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { logger } from "@/lib/logger";
import { ChatService } from "@/lib/services/chat";
import type { RoomWithMembers } from "@/lib/types/chat";

interface UseChatActionsProps {
	roomId?: string;
	roomKey?: CryptoKey;
	user?: { id: string } | null;
	room?: RoomWithMembers;
}

export function useChatActions({
	roomId,
	roomKey,
	user,
	room,
}: UseChatActionsProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [ending, setEnding] = useState(false);

	const sendMessage = async (text: string) => {
		if (!roomKey || !user || !roomId) return;
		try {
			await ChatService.sendMessage(roomId, user.id, text, roomKey);
		} catch (e) {
			logger.error("Failed to send message", e);
			throw e;
		}
	};

	const endSession = async () => {
		if (!roomId || !user) return;

		setEnding(true);
		try {
			await ChatService.clearRoom(roomId);

			// Если чат эфемерный, удаляем его полностью
			if (room?.is_ephemeral) {
				logger.info(`Deleting ephemeral room: ${roomId}`);
				await ChatService.deleteRoom(roomId);

				await queryClient.invalidateQueries({
					queryKey: ["rooms"],
					refetchType: "all",
				});
				logger.info(`Room ${roomId} deleted and queries invalidated`);
			}

			navigate({ to: "/chat" });
		} catch (e) {
			logger.error("Failed to end session", e);
		} finally {
			setEnding(false);
		}
	};

	return {
		sendMessage,
		endSession,
		ending,
	};
}
