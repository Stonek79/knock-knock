import { API_ROUTES, DB_TABLES, REALTIME_ACTIONS } from "../constants";
import { pb } from "../pocketbase";
import type { CallLogsResponse, CallLogsTypeOptions } from "../types";

export const callRepository = {
    /**
     * Запрашивает токен для участия в конференции
     * @param roomId - Идентификатор комнаты
     * @param callType - Тип звонка (аудио/видео)
     * @returns Токен для LiveKit
     */
    async getToken(
        roomId: string,
        callType: CallLogsTypeOptions,
    ): Promise<{ token: string }> {
        return await pb.send<{ token: string }>(API_ROUTES.CALLS_TOKEN, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: roomId, call_type: callType }),
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
