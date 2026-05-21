import { ERROR_CODES, MESSAGE_STATUS } from "@/lib/constants";
import { encryptMessage } from "@/lib/crypto/messages";
import { logger } from "@/lib/logger";
import { mediaDb } from "@/lib/mediadb/media-db";
import type { Attachment, MessageError, Result } from "@/lib/types";
import { appError, err, ok } from "@/lib/utils/result";
import { messageRepository } from "../repositories/message.repository";
import { mediaService } from "./media";

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
    metadata?: Record<string, unknown>;
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
 * Сервис для управления сообщениями в чате.
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
        metadata: customMetadata,
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
            room: roomId,
            sender: senderId,
            sender_name: senderName || "",
            sender_avatar: senderAvatar || "",
            content: ciphertext,
            iv,
            attachments: attachments ?? null,
            status: MESSAGE_STATUS.SENT,
            metadata: { deleted_by: [], ...customMetadata },
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
     * После успешного удаления очищает медиа из локального IndexedDB.
     */
    async deleteMessage({
        messageId,
        currentUserId,
        isOwnMessage,
        isAdmin,
    }: DeleteMessageOptions): Promise<Result<void, MessageError>> {
        // 1. Получаем сообщение для проверки прав и вложений
        const msgResult = await messageRepository.getMessageById(messageId);
        if (msgResult.isErr()) {
            if (msgResult.error.kind === ERROR_CODES.NOT_FOUND_ERROR) {
                try {
                    await mediaDb.deleteByMessageId({
                        messageId,
                        userId: currentUserId,
                    });
                } catch (e) {
                    logger.warn(
                        "Не удалось очистить медиа для несуществующего сообщения",
                        {
                            messageId,
                            error: e,
                        },
                    );
                }
                return ok(undefined);
            }
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    "Не удалось получить сообщение для удаления",
                    msgResult.error.details,
                ),
            );
        }

        const msg = msgResult.value;

        // 2. Если это своё сообщение ИЛИ мы админ — удаляем для всех
        if (isOwnMessage || isAdmin) {
            // Если оно уже удалено глобально (старый артефакт), пропускаем лишний запрос
            if (msg.is_deleted) {
                return ok(undefined);
            }

            if (msg.attachments) {
                // Удаляем медиа-файлы физически из облака и кэша
                for (const att of msg.attachments) {
                    await mediaService.deleteMedia({
                        id: att.id,
                        userId: currentUserId,
                    });
                }
            }

            const result = await messageRepository.hardDeleteMessage(messageId);

            if (result.isErr()) {
                return err(
                    appError(
                        ERROR_CODES.DB_ERROR,
                        "Не удалось удалить сообщение глобально",
                        result.error.details,
                    ),
                );
            }
        } else {
            // 3. Если чужое — скрываем только для себя через массив deleted_by в метаданных
            const rawDeletedBy = msg.metadata?.deleted_by;
            const deletedBy = Array.isArray(rawDeletedBy)
                ? [...rawDeletedBy]
                : [];

            // Если мы уже скрыли его локально, пропускаем лишний запрос
            if (deletedBy.includes(currentUserId)) {
                return ok(undefined);
            }

            if (!deletedBy.includes(currentUserId)) {
                deletedBy.push(currentUserId);
            }

            const result = await messageRepository.updateMessage(messageId, {
                metadata: {
                    ...(msg.metadata || {}),
                    deleted_by: deletedBy,
                },
            });

            if (result.isErr()) {
                return err(
                    appError(
                        ERROR_CODES.DB_ERROR,
                        "Не удалось скрыть сообщение локально",
                        result.error.details,
                    ),
                );
            }
        }

        // 4. Рекурсивно удаляем медиа из локального кэша (IndexedDB)
        try {
            await mediaDb.deleteByMessageId({
                messageId,
                userId: currentUserId,
            });
        } catch (e) {
            logger.warn("Не удалось очистить медиа для сообщения", {
                messageId,
                error: e,
            });
        }

        return ok(undefined);
    },

    /**
     * Очистка комнаты — использует пакетное удаление в репозитории.
     */
    async clearRoom(
        roomId: string,
        userId: string,
    ): Promise<Result<void, MessageError>> {
        const result = await messageRepository.clearRoom(roomId, userId);
        if (result.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    "Не удалось очистить комнату",
                    result.error.details,
                ),
            );
        }

        // Рекурсивно удаляем медиа из локального кэша (IndexedDB)
        try {
            await mediaDb.deleteByRoomId({
                roomId,
                userId,
            });
        } catch (e) {
            logger.warn("Не удалось очистить медиа при очистке комнаты", {
                roomId,
                error: e,
            });
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
            const updateResult = await messageRepository.updateMessage(
                messageId,
                {
                    status: MESSAGE_STATUS.DELIVERED,
                },
            );

            if (updateResult.isErr()) {
                logger.warn("Не удалось обновить статус доставки", {
                    messageId,
                    error: updateResult.error,
                });
            }
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
