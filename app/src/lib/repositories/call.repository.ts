import { API_ROUTES, DB_TABLES, REALTIME_ACTIONS } from "../constants";
import { pb } from "../pocketbase";
import { realtimeGateway } from "../services/RealtimeGateway";
import type {
    CallLogsResponse,
    CallLogsStatusOptions,
    CallLogsTypeOptions,
    RoomsResponse,
} from "../types";

export const callRepository = {
    /**
     * Запрашивает токен для участия в конференции.
     * @param roomId - Идентификатор комнаты
     * @param callType - Тип звонка (аудио/видео)
     * @param isJoin - Флаг присоединения/принятия звонка (не создает новый лог)
     * @param callLogId - Идентификатор существующего лога вызова
     * @returns Токен для LiveKit и ID записи лога звонка
     */
    async getToken(
        roomId: string,
        callType: CallLogsTypeOptions,
        isJoin?: boolean,
        callLogId?: string,
    ): Promise<{ token: string; callLogId?: string }> {
        return pb.send<{ token: string; callLogId?: string }>(
            API_ROUTES.CALLS_TOKEN,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    room_id: roomId,
                    call_type: callType,
                    is_join: isJoin,
                    call_log_id: callLogId,
                }),
            },
        );
    },

    /**
     * Безопасно обновляет статус записи звонка через серверный хук PocketBase.
     * @param callLogId - Идентификатор записи в call_logs
     * @param status - Новый статус звонка
     */
    async updateCallStatus(
        callLogId: string,
        status: CallLogsStatusOptions,
    ): Promise<CallLogsResponse> {
        return pb.send<CallLogsResponse>("/api/calls/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ call_log_id: callLogId, status }),
        });
    },

    /**
     * Получает лог звонка по ID.
     * @param callLogId - Идентификатор звонка
     */
    async getCallLogById(callLogId: string): Promise<CallLogsResponse> {
        return pb
            .collection(DB_TABLES.CALL_LOGS)
            .getOne<CallLogsResponse>(callLogId);
    },

    /**
     * Получает список всех логов звонков (историю звонков).
     * Privacy-safe: вложен только room (необходим для отображения названия).
     * initiator не раскрывается как объект профиля, чтобы не утекать
     * profile fields других участников.
     * @returns Массив записей из коллекции call_logs с раскрытием только room
     */
    async getCallLogs(): Promise<CallLogsResponse<{ room?: RoomsResponse }>[]> {
        return pb
            .collection(DB_TABLES.CALL_LOGS)
            .getFullList<CallLogsResponse<{ room?: RoomsResponse }>>({
                sort: "-created",
                expand: "room",
            });
    },

    /**
     * Подписка на входящие звонки (коллекция call_logs).
     * @param callback - Функция-обработчик входящей записи лога звонка
     * @returns Функция отписки
     */
    subscribeToCalls(callback: (record: CallLogsResponse) => void): () => void {
        let unsub: (() => void) | undefined;
        realtimeGateway
            .subscribe<CallLogsResponse>(DB_TABLES.CALL_LOGS, (e) => {
                if (
                    e.action === REALTIME_ACTIONS.CREATE ||
                    e.action === REALTIME_ACTIONS.UPDATE
                ) {
                    callback(e.record);
                }
            })
            .then((unsubscribeFn) => {
                unsub = unsubscribeFn;
            })
            .catch(() => {});

        return () => {
            if (unsub) {
                unsub();
            }
        };
    },
};
