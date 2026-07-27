import { callRepository } from "../repositories/call.repository";
import type {
    CallLogsResponse,
    CallLogsStatusOptions,
    CallLogsTypeOptions,
} from "../types";

/**
 * Сервис для работы со звонками.
 * Выступает в роли шины событий (Event Bus) и бизнес-слоя для работы со звонками.
 */
export const callService = {
    /**
     * Получает токен для комнаты.
     * @param roomId - Идентификатор комнаты
     * @param callType - Тип звонка (аудио/видео)
     * @returns Токен для подключения к LiveKit
     */
    async getToken(
        roomId: string,
        callType: CallLogsTypeOptions,
    ): Promise<{ token: string }> {
        return await callRepository.getToken(roomId, callType);
    },

    /**
     * Обновляет статус записи лога звонка.
     * @param callLogId - Идентификатор лога звонка
     * @param status - Новый статус (ringing/accepted/rejected/ended/cancelled)
     */
    async updateCallStatus(
        callLogId: string,
        status: CallLogsStatusOptions,
    ): Promise<CallLogsResponse> {
        return await callRepository.updateCallStatus(callLogId, status);
    },

    /**
     * Подписка шины событий (Event Bus) на входящие звонки.
     * Обертка над репозиторием, обеспечивающая соблюдение архитектуры Data Layer -> Service Layer.
     * @param callback - Функция-обработчик входящей записи лога звонка
     * @returns Функция отписки
     */
    subscribeToIncomingCalls(
        callback: (record: CallLogsResponse) => void,
    ): () => void {
        return callRepository.subscribeToCalls(callback);
    },
};
