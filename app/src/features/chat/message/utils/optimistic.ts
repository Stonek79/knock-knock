import { DB_TABLES, MESSAGE_STATUS, MESSAGE_TYPE } from "@/lib/constants";
import { CLIENT_MESSAGE_STATUS } from "@/lib/constants/ui";
import type { Attachment, ChatMessage } from "@/lib/types";

/**
 * Параметры для создания оптимистичного сообщения
 */
export type OptimisticMessageParams = {
    /** Временный ID (crypto.randomUUID()) */
    tempId: string;
    /** Текст сообщения */
    text: string;
    /** ID отправителя */
    senderId: string;
    /** Имя отправителя */
    senderName: string;
    /** Аватар отправителя */
    senderAvatar: string;
    /** ID комнаты */
    roomId: string;
    /** Вложения (с Blob URL для превью) */
    attachments?: Attachment[];
    /** Blob URLs для очистки через revokeObjectURL */
    blobUrls?: string[];
};

/**
 * Создаёт оптимистичное сообщение для мгновенного отображения в UI.
 *
 * Сообщение добавляется в TanStack Query кэш ЗА МГНОВЕНИЕ до отправки на сервер.
 * Содержит _uiStatus: "sending" для отображения индикатора,
 * и _tempId для последующей замены на реальный серверный ID.
 *
 * @param params - Параметры сообщения
 * @returns Объект ChatMessage, готовый для вставки в кэш
 */
export function createOptimisticMessage(
    params: OptimisticMessageParams,
): ChatMessage {
    const now = new Date().toISOString();

    return {
        // --- Поля из BaseSystemFields (PocketBase) ---
        id: params.tempId,
        collectionId: "",
        collectionName: DB_TABLES.MESSAGES,
        created: now,
        updated: now,

        // --- Поля из MessagesRecord ---
        room: params.roomId,
        sender: params.senderId,
        sender_name: params.senderName,
        sender_avatar: params.senderAvatar,
        content: params.text || null,
        iv: "",
        type: MESSAGE_TYPE.TEXT,
        status: MESSAGE_STATUS.SENT,
        is_edited: false,
        is_deleted: false,
        is_starred: false,
        is_system: false,
        is_test: false,
        deleted_by: [],
        deleted_at: "",
        reply_to: "",

        // --- Переопределённые JSON-поля (MessageRow) ---
        metadata: { deleted_by: [] },
        attachments: params.attachments ?? null,
        reactions_summary: null,

        // --- Клиентские мета-поля ---
        _uiStatus: CLIENT_MESSAGE_STATUS.SENDING,
        _tempId: params.tempId,
        _blobUrls: params.blobUrls,
    };
}
