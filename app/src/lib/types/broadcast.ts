import type { MediaTypeOptions } from "./pocketbase-types";

/**
 * @module BroadcastTypes
 * @description Доменные типы для функционала Broadcast-рассылок.
 */

/**
 * Полезная нагрузка (payload) задачи типа "broadcast" в очереди task_queue.
 * Структура хранится в JSON-поле payload и создаётся хуком /api/custom/broadcast.
 */
export interface BroadcastTaskPayload {
    /** Текст рассылки */
    text: string;
    /** ID администратора, создавшего рассылку */
    adminId: string;
    /** Массив ID медиа-вложений (коллекция media) */
    attachments: string[];
    /** Обогащенные метаданные медиа-вложений (возвращаются API истории рассылок) */
    mediaAttachments?: Array<{
        id: string;
        file_name: string;
        file_size: number;
        content_type: string;
        type: MediaTypeOptions;
    }>;
}
