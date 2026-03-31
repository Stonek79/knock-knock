import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { QUERY_KEYS, ROOM_TYPE, ROUTES, USER_ROLE } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { MessageService } from "@/lib/services/message";
import { RoomService } from "@/lib/services/room";
import type { Attachment, Profile, RoomWithMembers } from "@/lib/types";
import { uploadAudio, uploadMedia } from "../services/uploadMedia";

interface UseChatActionsProps {
    roomId?: string;
    roomKey?: CryptoKey;
    /** Профиль текущего пользователя */
    user?: Profile | null;
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
    const toast = useToast();
    const [ending, setEnding] = useState(false);

    /**
     * Отправка зашифрованного сообщения.
     */
    const sendMessage = async (
        text: string,
        files?: File[],
        audioBlob?: Blob,
    ) => {
        if (!roomKey || !user || !roomId) {
            logger.warn(
                "Невозможно отправить: отсутствуют ключи или ID комнаты",
            );
            return;
        }

        const attachments: Attachment[] = [];

        try {
            if (audioBlob) {
                const audioAttachment = await uploadAudio(
                    audioBlob,
                    roomId,
                    roomKey,
                );
                attachments.push(audioAttachment);
            }

            if (files && files.length > 0) {
                const filePromises = files.map((file) => uploadMedia(file));
                const uploadedFiles = await Promise.all(filePromises);
                attachments.push(...uploadedFiles);
            }
        } catch (uploadError) {
            logger.error("Ошибка загрузки медиафайла", uploadError);
            toast({
                title: "Ошибка при загрузке файла",
                variant: "error",
            });
            throw uploadError;
        }

        const result = await MessageService.sendMessage({
            roomId,
            senderId: user.id,
            senderName: user.display_name,
            senderAvatar: user.avatar_url || "",
            content: text,
            roomKey,
            attachments: attachments.length > 0 ? attachments : undefined,
        });

        if (result.isErr()) {
            logger.error("Ошибка отправки сообщения", result.error);
            toast({
                title: "Не удалось отправить сообщение",
                variant: "error",
            });
            return;
        }

        // Инвалидируем список чатов, чтобы обновился last_message и применилась сортировка
        await queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.rooms(user.id),
        });
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
                logger.error("Ошибка очистки комнаты", clearResult.error);
            }

            // Если чат эфемерный (временный), удаляем его полностью из базы
            if (room?.type === ROOM_TYPE.EPHEMERAL) {
                logger.info(`Удаление эфемерной комнаты: ${roomId}`);
                const deleteResult = await RoomService.deleteRoom(roomId);
                if (deleteResult.isErr()) {
                    logger.error("Ошибка удаления комнаты", deleteResult.error);
                } else {
                    // Обновляем список комнат в кэше
                    await queryClient.invalidateQueries({
                        queryKey: QUERY_KEYS.rooms(user.id),
                        refetchType: "all",
                    });
                    logger.info(`Комната ${roomId} удалена, кэш обновлён`);
                }
            }

            navigate({ to: ROUTES.CHAT_LIST });
        } catch (e) {
            logger.error("Ошибка завершения сессии", e);
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
        const result = await MessageService.deleteMessage({
            messageId,
            currentUserId: user.id,
            isOwnMessage,
            isAdmin: user.role === USER_ROLE.ADMIN,
        });
        if (result.isOk()) {
            if (roomId) {
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.messages(roomId),
                });
            }
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.rooms(user.id),
            });
        } else {
            logger.error("Ошибка удаления сообщения", result.error);
            toast({
                title: "Не удалось удалить сообщение",
                variant: "error",
            });
        }
    };

    /**
     * Редактирование сообщения.
     * Новый текст шифруется тем же ключом комнаты.
     */
    const updateMessage = async (messageId: string, newContent: string) => {
        if (!roomKey) {
            logger.warn("Невозможно обновить: отсутствует ключ шифрования");
            return;
        }

        const result = await MessageService.updateMessage({
            messageId,
            newContent,
            roomKey,
        });

        if (result.isErr()) {
            logger.error("Ошибка обновления сообщения", result.error);
            toast({
                title: "Не удалось обновить сообщение",
                variant: "error",
            });
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
