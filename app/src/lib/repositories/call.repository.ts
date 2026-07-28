import { API_ROUTES, DB_TABLES, REALTIME_ACTIONS } from "../constants";
import { pb } from "../pocketbase";
import type {
    CallLogsResponse,
    CallLogsStatusOptions,
    CallLogsTypeOptions,
    RoomsResponse,
} from "../types";

export const callRepository = {
    /**
     * Запрашивает токен для участия в конференции
     * @param roomId - Идентификатор комнаты
     * @param callType - Тип звонка (аудио/видео)
     * @returns Токен для LiveKit и ID записи лога звонка
     */
    async getToken(
        roomId: string,
        callType: CallLogsTypeOptions,
    ): Promise<{ token: string; callLogId?: string }> {
        return pb.send<{ token: string; callLogId?: string }>(
            API_ROUTES.CALLS_TOKEN,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ room_id: roomId, call_type: callType }),
            },
        );
    },

    /**
     * Обновляет статус записи звонка в базе данных.
     * @param callLogId - Идентификатор записи в call_logs
     * @param status - Новый статус звонка
     */
    async updateCallStatus(
        callLogId: string,
        status: CallLogsStatusOptions,
    ): Promise<CallLogsResponse> {
        return pb
            .collection(DB_TABLES.CALL_LOGS)
            .update<CallLogsResponse>(callLogId, { status });
    },

    /**
     * Получает список всех логов звонков (историю звонков)
     * @returns Массив записей из коллекции call_logs с раскрытием связей room и initiator
     */
    async getCallLogs(): Promise<CallLogsResponse<{ room?: RoomsResponse }>[]> {
        return pb
            .collection(DB_TABLES.CALL_LOGS)
            .getFullList<CallLogsResponse<{ room?: RoomsResponse }>>({
                sort: "-created",
                expand: "room,initiator",
            });
    },

    /**
     * Подписка на входящие звонки (коллекция call_logs).
     * @param callback - Функция-обработчик входящей записи лога звонка
     * @returns Функция отписки
     */
    subscribeToCalls: (callback: (record: CallLogsResponse) => void) => {
        const unsubscribePromise = pb
            .collection(DB_TABLES.CALL_LOGS)
            .subscribe<CallLogsResponse>("*", (e) => {
                if (
                    e.action === REALTIME_ACTIONS.CREATE ||
                    e.action === REALTIME_ACTIONS.UPDATE
                ) {
                    callback(e.record);
                }
            });

        return () => {
            unsubscribePromise.then((unsub) => unsub()).catch(() => {});
        };
    },
};
