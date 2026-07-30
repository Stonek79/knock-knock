import { callRepository } from "../repositories/call.repository";
import type {
    CallLogsResponse,
    CallLogsStatusOptions,
    CallLogsTypeOptions,
    RoomsResponse,
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
     * @param isJoin - Флаг присоединения к звонку
     * @param callLogId - ID существующего лога звонка
     * @returns Токен для подключения к LiveKit и ID записи звонка
     */
    async getToken(
        roomId: string,
        callType: CallLogsTypeOptions,
        isJoin?: boolean,
        callLogId?: string,
    ): Promise<{ token: string; callLogId?: string }> {
        return callRepository.getToken(roomId, callType, isJoin, callLogId);
    },

    /**
     * Обновляет статус записи лога звонка.
     * @param callLogId - Идентификатор лога звонка
     * @param status - Новый статус (ringing/ongoing/ended/missed/rejected)
     */
    async updateCallStatus(
        callLogId: string,
        status: CallLogsStatusOptions,
    ): Promise<CallLogsResponse> {
        return callRepository.updateCallStatus(callLogId, status);
    },

    /**
     * Получает лог звонка по ID.
     * @param callLogId - Идентификатор лога звонка
     */
    async getCallLogById(callLogId: string): Promise<CallLogsResponse> {
        return callRepository.getCallLogById(callLogId);
    },

    /**
     * Получает список всех логов звонков (историю звонков).
     * @returns Массив записей из коллекции call_logs
     */
    async getCallLogs(): Promise<CallLogsResponse<{ room?: RoomsResponse }>[]> {
        return callRepository.getCallLogs();
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
