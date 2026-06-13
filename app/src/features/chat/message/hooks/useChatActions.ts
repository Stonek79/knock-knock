import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import {
    CLIENT_MESSAGE_STATUS,
    OPTIMISTIC_ID_PREFIX,
    QUERY_KEYS,
    ROOM_TYPE,
    ROUTES,
    USER_ROLE,
} from "@/lib/constants";
import { logger } from "@/lib/logger";
import { MessageService } from "@/lib/services/message";
import { RoomService } from "@/lib/services/room";
import type { ChatMessage, Profile, RoomWithMembers } from "@/lib/types";

type UseChatActionsProps = {
    roomId?: string;
    roomKey?: CryptoKey;
    /** Профиль текущего пользователя */
    user?: Profile | null;
    room?: RoomWithMembers;
};

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
    const { t } = useTranslation();
    const [ending, setEnding] = useState(false);

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
            const clearResult = await MessageService.clearRoom(roomId, user.id);
            if (clearResult.isErr()) {
                logger.error("Ошибка очистки комнаты", clearResult.error);
            } else {
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.rooms(user.id),
                });
            }

            // Если чат эфемерный (временный), удаляем его полностью из базы
            if (room?.type === ROOM_TYPE.EPHEMERAL) {
                logger.info(`Удаление эфемерной комнаты: ${roomId}`);
                const deleteResult = await RoomService.deleteRoom({
                    roomId,
                    userId: user.id,
                });
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
    const deleteMessage = async ({
        messageId,
        isOwnMessage,
    }: {
        messageId: string;
        isOwnMessage: boolean;
    }) => {
        if (!user) {
            return;
        }

        const isTemporary = messageId.startsWith(OPTIMISTIC_ID_PREFIX);
        let isFailed = false;
        let blobUrlsToRevoke: string[] = [];

        if (roomId) {
            const currentMessages =
                queryClient.getQueryData<ChatMessage[]>(
                    QUERY_KEYS.messages(roomId),
                ) ?? [];
            const foundMsg = currentMessages.find((m) => {
                return m.id === messageId;
            });
            if (foundMsg) {
                if (foundMsg._uiStatus === CLIENT_MESSAGE_STATUS.FAILED) {
                    isFailed = true;
                }
                if (foundMsg._blobUrls) {
                    blobUrlsToRevoke = foundMsg._blobUrls;
                }
            }
        }

        if (isTemporary || isFailed) {
            if (blobUrlsToRevoke.length > 0) {
                for (const url of blobUrlsToRevoke) {
                    URL.revokeObjectURL(url);
                }
            }

            if (roomId) {
                queryClient.setQueryData<ChatMessage[]>(
                    QUERY_KEYS.messages(roomId),
                    (old = []) => {
                        return old.filter((m) => {
                            return m.id !== messageId;
                        });
                    },
                );
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.rooms(user.id),
                });
            }
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
                title: t("chat.deleteFailed", "Не удалось удалить сообщение"),
                variant: "error",
            });
        }
    };

    /**
     * Редактирование сообщения.
     */
    const updateMessage = async ({
        messageId,
        newContent,
    }: {
        messageId: string;
        newContent: string;
    }) => {
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
        } else {
            if (roomId) {
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.messages(roomId),
                });
            }
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.rooms(user?.id),
            });
        }
    };

    return {
        endSession,
        deleteMessage,
        updateMessage,
        ending,
    };
}
