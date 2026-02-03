import { DB_TABLES } from '@/lib/constants';
import { encryptMessage } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';

/**
 * Сервис для управления сообщениями.
 */
export const MessageService = {
    /**
     * Отправляет сообщение.
     */
    async sendMessage(
        roomId: string,
        senderId: string,
        content: string,
        roomKey: CryptoKey,
    ) {
        let ciphertext: string = content;
        let iv: string = 'mock-iv';

        if (import.meta.env.VITE_USE_MOCK !== 'true') {
            const encrypted = await encryptMessage(content, roomKey);
            ciphertext = encrypted.ciphertext;
            iv = encrypted.iv;
        }

        const { error } = await supabase.from(DB_TABLES.MESSAGES).insert({
            room_id: roomId,
            sender_id: senderId,
            content: ciphertext,
            iv: iv,
        });

        if (error) throw error;
    },

    /**
     * Редактирует сообщение.
     */
    async updateMessage(
        messageId: string,
        newContent: string,
        roomKey: CryptoKey,
    ) {
        let ciphertext = newContent;
        let iv = 'mock-iv';

        if (import.meta.env.VITE_USE_MOCK !== 'true') {
            const encrypted = await encryptMessage(newContent, roomKey);
            ciphertext = encrypted.ciphertext;
            iv = encrypted.iv;
        }

        const { error } = await supabase
            .from(DB_TABLES.MESSAGES)
            .update({
                content: ciphertext,
                iv: iv,
                is_edited: true,
                updated_at: new Date().toISOString(),
            })
            .eq('id', messageId);

        if (error) throw error;
    },

    /**
     * Удаляет сообщение (Secure Delete).
     * Стирает контент и помечает флаг is_deleted.
     */
    /**
     * Удаляет сообщение.
     * - Если свое: Global Soft Delete (is_deleted=true).
     * - Если чужое: Local Delete (deleted_by array).
     */
    async deleteMessage(
        messageId: string,
        currentUserId: string,
        isOwnMessage: boolean,
    ) {
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
                .eq('id', messageId);
            if (error) throw error;
        } else {
            // Local Delete (Delete for Me)
            // Postgres: update messages set deleted_by = array_append(deleted_by, userId) where id = ...

            // Сначала получаем текущий массив deleted_by
            const { data: msg, error: fetchError } = await supabase
                .from(DB_TABLES.MESSAGES)
                .select('deleted_by')
                .eq('id', messageId)
                .single();

            if (fetchError) throw fetchError;

            const currentDeletedBy = msg?.deleted_by || [];
            if (!currentDeletedBy.includes(currentUserId)) {
                const { error } = await supabase
                    .from(DB_TABLES.MESSAGES)
                    .update({
                        deleted_by: [...currentDeletedBy, currentUserId],
                    })
                    .eq('id', messageId);
                if (error) throw error;
            }
        }
    },

    /**
     * Удаляет все сообщения в комнате.
     */
    async clearRoom(roomId: string) {
        const { error } = await supabase
            .from(DB_TABLES.MESSAGES)
            .delete()
            .eq('room_id', roomId);
        if (error) throw error;
    },

    /**
     * Помечает все сообщения в комнате от собеседника как прочитанные.
     */
    async markMessagesAsRead(roomId: string, currentUserId: string) {
        const { error } = await supabase
            .from(DB_TABLES.MESSAGES)
            .update({ status: 'read' })
            .eq('room_id', roomId)
            .neq('sender_id', currentUserId)
            .neq('status', 'read'); // Opt: only unread

        if (error) throw error;
    },

    /**
     * Помечает сообщение как доставленное. (Вызывается получателем при получении push/realtime)
     */
    async markMessageAsDelivered(messageId: string) {
        // Only mark if currently 'sent'
        const { error } = await supabase
            .from(DB_TABLES.MESSAGES)
            .update({ status: 'delivered' })
            .eq('id', messageId)
            .eq('status', 'sent');

        if (error) throw error;
    },
};
