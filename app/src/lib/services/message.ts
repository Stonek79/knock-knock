import { ERROR_CODES, MESSAGE_STATUS } from "@/lib/constants";
import { encryptMessage } from "@/lib/crypto/messages";
import { logger } from "@/lib/logger";
import type { Attachment, Result } from "@/lib/types";
import type { MessageError } from "@/lib/types/message";
import { appError, err, ok } from "@/lib/utils/result";
import { messageRepository } from "../repositories/message.repository";

/**
 * Параметры для отправки сообщения
 */
export interface SendMessageOptions {
    roomId: string;
    senderId: string;
    senderName?: string;
    senderAvatar?: string;
    content: string;
    roomKey: CryptoKey;
    attachments?: Attachment[];
}

/**
 * Параметры для обновления сообщения
 */
export interface UpdateMessageOptions {
    messageId: string;
    newContent: string;
    roomKey: CryptoKey;
}

/**
 * Параметры для удаления сообщения
 */
export interface DeleteMessageOptions {
    messageId: string;
    currentUserId: string;
    isOwnMessage: boolean;
    isAdmin?: boolean;
}

/**
 * Сервис для управления сообщениями в чате (V2+).
 * Оркестрирует бизнес-логику (шифрование) и использует репозиторий для сохранения данных.
 */
export const MessageService = {
    /**
     * Отправляет зашифрованное сообщение в комнату.
     */
    async sendMessage({
        roomId,
        senderId,
        senderName,
        senderAvatar,
        content,
        roomKey,
        attachments,
    }: SendMessageOptions): Promise<Result<string, MessageError>> {
        let ciphertext = content;
        let iv = "";

        try {
            const encrypted = await encryptMessage(content, roomKey);
            ciphertext = encrypted.ciphertext;
            iv = encrypted.iv;
        } catch (e) {
            logger.error("Ошибка при шифровании сообщения", e);
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    "Ошибка шифрования",
                    e instanceof Error ? e : undefined,
                ),
            );
        }

        const result = await messageRepository.sendMessage({
            room_id: roomId,
            sender_id: senderId,
            sender_name: senderName || "",
            sender_avatar: senderAvatar || "",
            content: ciphertext,
            iv,
            attachments: attachments ?? null,
            status: MESSAGE_STATUS.SENT,
        });

        if (result.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    "Не удалось отправить сообщение",
                    result.error.details,
                ),
            );
        }

        return ok(result.value.id);
    },

    /**
     * Редактирует сообщение.
     */
    async updateMessage({
        messageId,
        newContent,
        roomKey,
    }: UpdateMessageOptions): Promise<Result<void, MessageError>> {
        let ciphertext = newContent;
        let iv = "";

        try {
            const encrypted = await encryptMessage(newContent, roomKey);
            ciphertext = encrypted.ciphertext;
            iv = encrypted.iv;
        } catch (e) {
            logger.error("Ошибка при шифровании обновленного сообщения", e);
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    "Ошибка шифрования",
                    e instanceof Error ? e : undefined,
                ),
            );
        }

        const result = await messageRepository.editMessage(
            messageId,
            ciphertext,
            iv,
        );

        if (result.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    "Не удалось обновить сообщение",
                    result.error.details,
                ),
            );
        }

        return ok(undefined);
    },

    /**
     * Удаляет сообщение (Soft Delete или Local Delete).
     */
    async deleteMessage({
        messageId,
        currentUserId,
        isOwnMessage,
        isAdmin,
    }: DeleteMessageOptions): Promise<Result<void, MessageError>> {
        // Если это своё сообщение ИЛИ мы админ — удаляем для всех (soft delete)
        if (isOwnMessage || isAdmin) {
            const result = await messageRepository.updateMessage(messageId, {
                content: "",
                iv: "",
                is_edited: false,
                is_deleted: true,
                metadata: {
                    deleted_by: [],
                    moderation: isAdmin,
                },
            });
            if (result.isErr()) {
                return err(
                    appError(
                        ERROR_CODES.DB_ERROR,
                        "Не удалось удалить сообщение",
                        result.error.details,
                    ),
                );
            }
        } else {
            // Если чужое — скрываем только для себя через массив deleted_by в метаданных
            const msgResult = await messageRepository.getMessageById(messageId);
            if (msgResult.isErr()) {
                return err(
                    appError(
                        ERROR_CODES.DB_ERROR,
                        "Не удалось получить сообщение для скрытия",
                        msgResult.error.details,
                    ),
                );
            }

            const msg = msgResult.value;
            const currentMetadata = msg.metadata;
            const deletedBy = [...currentMetadata.deleted_by];

            if (!deletedBy.includes(currentUserId)) {
                deletedBy.push(currentUserId);
            }

            const result = await messageRepository.updateMessage(messageId, {
                metadata: {
                    ...currentMetadata,
                    deleted_by: deletedBy,
                },
            });

            if (result.isErr()) {
                return err(
                    appError(
                        ERROR_CODES.DB_ERROR,
                        "Не удалось скрыть сообщение",
                        result.error.details,
                    ),
                );
            }
        }
        return ok(undefined);
    },

    /**
     * Очистка комнаты — использует пакетное удаление в репозитории.
     */
    async clearRoom(roomId: string): Promise<Result<void, MessageError>> {
        const result = await messageRepository.clearRoom(roomId);
        if (result.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    "Не удалось очистить комнату",
                    result.error.details,
                ),
            );
        }
        return ok(undefined);
    },

    /**
     * Помечает сообщения как прочитанные — делегирует в репозиторий.
     */
    async markMessagesAsRead(
        roomId: string,
        currentUserId: string,
    ): Promise<Result<void, MessageError>> {
        const result = await messageRepository.markMessagesAsRead(
            roomId,
            currentUserId,
        );
        if (result.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    "Не удалось пометить сообщения как прочитанные",
                    result.error.details,
                ),
            );
        }
        return ok(undefined);
    },

    /**
     * Помечает доставку.
     */
    async markMessageAsDelivered(
        messageId: string,
    ): Promise<Result<void, MessageError>> {
        const msgResult = await messageRepository.getMessageById(messageId);
        if (
            msgResult.isOk() &&
            msgResult.value.status === MESSAGE_STATUS.SENT
        ) {
            await messageRepository.updateMessage(messageId, {
                status: MESSAGE_STATUS.DELIVERED,
            });
        }
        return ok(undefined);
    },

    /**
     * Переключает флаг избранного.
     */
    async toggleStar(
        messageId: string,
        isStarred: boolean,
    ): Promise<Result<void, MessageError>> {
        const result = await messageRepository.updateMessage(messageId, {
            is_starred: isStarred,
        });

        if (result.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    "Не удалось изменить статус избранного",
                    result.error.details,
                ),
            );
        }
        return ok(undefined);
    },
};
