import type { PostgrestError } from "@supabase/supabase-js";
import { DB_TABLES } from "@/lib/constants";
import { ERROR_CODES } from "@/lib/constants/errors";
import { encryptMessage } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import type { AppError, Result } from "@/lib/types/result";
import { appError, err, ok } from "@/lib/utils/result";

export type MessageError =
    | AppError<typeof ERROR_CODES.DB_ERROR, PostgrestError>
    | AppError<typeof ERROR_CODES.CRYPTO_ERROR, Error>;

/**
 * Сервис для управления сообщениями.
 * Отвечает за шифрование и отправку/редактирование/удаление сообщений.
 */
export const MessageService = {
    /**
     * Отправляет зашифрованное сообщение в комнату.
     */
    async sendMessage(
        roomId: string,
        senderId: string,
        content: string,
        roomKey: CryptoKey,
    ): Promise<Result<string, MessageError>> {
        let ciphertext: string = content;
        let iv: string = "mock-iv";

        // Шифрование (если не мок)
        if (import.meta.env.VITE_USE_MOCK !== "true") {
            try {
                const encrypted = await encryptMessage(content, roomKey);
                ciphertext = encrypted.ciphertext;
                iv = encrypted.iv;
            } catch (e) {
                logger.error("Failed to encrypt message", e);
                return err(
                    appError(
                        ERROR_CODES.CRYPTO_ERROR,
                        "Encryption failed",
                        e instanceof Error ? e : undefined,
                    ),
                );
            }
        }

        const { data, error } = await supabase
            .from(DB_TABLES.MESSAGES)
            .insert({
                room_id: roomId,
                sender_id: senderId,
                content: ciphertext,
                iv: iv,
            })
            .select("id")
            .single();

        if (error) {
            return err(
                appError(ERROR_CODES.DB_ERROR, "Failed to send message", error),
            );
        }

        return ok(data.id);
    },

    /**
     * Редактирует сообщение.
     * Новое содержимое шифруется тем же ключом комнаты.
     */
    async updateMessage(
        messageId: string,
        newContent: string,
        roomKey: CryptoKey,
    ): Promise<Result<void, MessageError>> {
        let ciphertext = newContent;
        let iv = "mock-iv";

        if (import.meta.env.VITE_USE_MOCK !== "true") {
            try {
                const encrypted = await encryptMessage(newContent, roomKey);
                ciphertext = encrypted.ciphertext;
                iv = encrypted.iv;
            } catch (e) {
                logger.error("Failed to encrypt updated message", e);
                return err(
                    appError(
                        ERROR_CODES.CRYPTO_ERROR,
                        "Encryption failed",
                        e instanceof Error ? e : undefined,
                    ),
                );
            }
        }

        const { error } = await supabase
            .from(DB_TABLES.MESSAGES)
            .update({
                content: ciphertext,
                iv: iv,
                is_edited: true,
                updated_at: new Date().toISOString(),
            })
            .eq("id", messageId);

        if (error) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    "Failed to update message",
                    error,
                ),
            );
        }

        return ok(undefined);
    },

    /**
     * Удаляет сообщение.
     * - Если свое: Global Soft Delete (is_deleted=true).
     * - Если чужое: Local Delete (deleted_by array).
     */
    async deleteMessage(
        messageId: string,
        currentUserId: string,
        isOwnMessage: boolean,
    ): Promise<Result<void, MessageError>> {
        if (isOwnMessage) {
            // Global Delete (как раньше)
            const { error } = await supabase
                .from(DB_TABLES.MESSAGES)
                .update({
                    content: null,
                    iv: null,
                    is_deleted: true,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", messageId);

            if (error) {
                return err(
                    appError(
                        ERROR_CODES.DB_ERROR,
                        "Failed to delete message globally",
                        error,
                    ),
                );
            }
        } else {
            // Local Delete (Delete for Me)
            // 1. Получаем текущий массив deleted_by
            const { data: msg, error: fetchError } = await supabase
                .from(DB_TABLES.MESSAGES)
                .select("deleted_by")
                .eq("id", messageId)
                .single();

            if (fetchError) {
                return err(
                    appError(
                        ERROR_CODES.DB_ERROR,
                        "Failed to fetch message for deletion",
                        fetchError,
                    ),
                );
            }

            const currentDeletedBy = msg?.deleted_by || [];
            if (!currentDeletedBy.includes(currentUserId)) {
                const { error } = await supabase
                    .from(DB_TABLES.MESSAGES)
                    .update({
                        deleted_by: [...currentDeletedBy, currentUserId],
                    })
                    .eq("id", messageId);

                if (error) {
                    return err(
                        appError(
                            ERROR_CODES.DB_ERROR,
                            "Failed to delete message locally",
                            error,
                        ),
                    );
                }
            }
        }

        return ok(undefined);
    },

    /**
     * Удаляет все сообщения в комнате (админское действие или очистка эфемерных).
     */
    async clearRoom(roomId: string): Promise<Result<void, MessageError>> {
        const { error } = await supabase
            .from(DB_TABLES.MESSAGES)
            .delete()
            .eq("room_id", roomId);

        if (error) {
            return err(
                appError(ERROR_CODES.DB_ERROR, "Failed to clear room", error),
            );
        }

        return ok(undefined);
    },

    /**
     * Помечает все сообщения в комнате от собеседника как прочитанные.
     */
    async markMessagesAsRead(
        roomId: string,
        currentUserId: string,
    ): Promise<Result<void, MessageError>> {
        const { error } = await supabase
            .from(DB_TABLES.MESSAGES)
            .update({ status: "read" })
            .eq("room_id", roomId)
            .neq("sender_id", currentUserId)
            .neq("status", "read"); // Opt: only unread

        if (error) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    "Failed to mark messages as read",
                    error,
                ),
            );
        }

        return ok(undefined);
    },

    /**
     * Помечает сообщение как доставленное.
     */
    async markMessageAsDelivered(
        messageId: string,
    ): Promise<Result<void, MessageError>> {
        const { error } = await supabase
            .from(DB_TABLES.MESSAGES)
            .update({ status: "delivered" })
            .eq("id", messageId)
            .eq("status", "sent");

        if (error) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    "Failed to mark message delivered",
                    error,
                ),
            );
        }

        return ok(undefined);
    },
};
