import { MESSAGE_STATUS } from "@/lib/constants";
import { CLIENT_MESSAGE_STATUS } from "@/lib/constants/ui";
import type { Attachment, ChatMessage } from "@/lib/types";

/**
 * Параметры для создания оптимистичного сообщения
 */
export interface OptimisticMessageParams {
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
}

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
        id: params.tempId,
        room_id: params.roomId,
        sender_id: params.senderId,
        sender_name: params.senderName,
        sender_avatar: params.senderAvatar,
        content: params.text || null,
        iv: "",
        status: MESSAGE_STATUS.SENT, // Формальный серверный статус (не используется для UI)
        is_edited: false,
        is_deleted: false,
        is_starred: false,
        created_at: now,
        updated_at: now,
        metadata: { deleted_by: [] },
        attachments: params.attachments ?? null,
        // --- Клиентские мета-поля ---
        _uiStatus: CLIENT_MESSAGE_STATUS.SENDING,
        _tempId: params.tempId,
        _blobUrls: params.blobUrls,
    };
}
