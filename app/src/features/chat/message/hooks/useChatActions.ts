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
            logger.warn("Cannot send message: missing keys or room ID");
            return;
        }

        const result = await MessageService.sendMessage(
            roomId,
            user.id,
            text,
            roomKey,
        );
        if (result.isErr()) {
            logger.error("Failed to send message", result.error);
            // Здесь можно добавить toast error notification
            throw new Error(result.error.message); // Для совместимости с вызывающим кодом, если он ждет throw, или обработать тут
        }
    };

    /**
     * Завершение сессии чата.
     * Очищает историю сообщений. Если чат эфемерный — удаляет комнату полностью.
     */
    const endSession = async () => {
        if (!roomId || !user) {
            return;
        }

        setEnding(true);
        try {
            const clearResult = await MessageService.clearRoom(roomId);
            if (clearResult.isErr()) {
                logger.error("Failed to clear room", clearResult.error);
            }

            // Если чат эфемерный (временный), удаляем его полностью из базы
            if (room?.is_ephemeral) {
                logger.info(`Deleting ephemeral room: ${roomId}`);
                const deleteResult = await RoomService.deleteRoom(roomId);
                if (deleteResult.isErr()) {
                    logger.error("Failed to delete room", deleteResult.error);
                } else {
                    // Обновляем список комнат в кэше
                    await queryClient.invalidateQueries({
                        queryKey: ["rooms"],
                        refetchType: "all",
                    });
                    logger.info(`Room ${roomId} deleted, cache updated`);
                }
            }

            navigate({ to: "/chat" });
        } catch (e) {
            logger.error("Error ending session", e);
        } finally {
            setEnding(false);
        }
    };

    /**
     * Безопасное удаление сообщения (Secure Delete).
     */
    const deleteMessage = async (messageId: string, isOwnMessage: boolean) => {
        if (!user) {
            return;
        }

        const result = await MessageService.deleteMessage(
            messageId,
            user.id,
            isOwnMessage,
        );

        if (result.isErr()) {
            logger.error("Failed to delete message", result.error);
            throw new Error(result.error.message);
        }
    };

    /**
     * Редактирование сообщения.
     * Новый текст шифруется тем же ключом комнаты.
     */
    const updateMessage = async (messageId: string, newContent: string) => {
        if (!roomKey) {
            logger.warn("Cannot update: missing encryption key");
            return;
        }

        const result = await MessageService.updateMessage(
            messageId,
            newContent,
            roomKey,
        );

        if (result.isErr()) {
            logger.error("Failed to update message", result.error);
            throw new Error(result.error.message);
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
