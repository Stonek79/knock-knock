import { useEffect } from "react";
import { ACTIVE_CALL_STATUS, CALL_STATUS } from "@/lib/constants";
import { callService } from "@/lib/services/call.service";
import { useAuthStore } from "@/stores/auth";
import { useCallStore } from "../store";

/**
 * Хук для прослушивания событий звонков по WebSocket (PocketBase SSE / Event Bus).
 * Обеспечивает мгновенный отклик на входящие вызовы (включая вторую линию),
 * а также автоматическое завершение звонка при отмене, сбросе или завершении собеседником.
 */
export function useCallRealtime() {
    const pbUser = useAuthStore((state) => state.pbUser);

    useEffect(() => {
        if (!pbUser) {
            return;
        }

        const unsubscribe = callService.subscribeToIncomingCalls((record) => {
            const store = useCallStore.getState();

            // 1. Входящий звонок (записываем в incomingSession даже при активном вызове для второй линии)
            if (
                record.status === CALL_STATUS.RINGING &&
                record.initiator !== pbUser.id
            ) {
                if (store.incomingSession?.callLogId !== record.id) {
                    store.setIncomingCall(record.room, record.id, record.type);
                }
                return;
            }

            // 2. Инициатор получает ONGOING (собеседник принял вызов)
            if (
                record.status === CALL_STATUS.ONGOING &&
                store.activeSession?.callLogId === record.id
            ) {
                if (
                    store.activeSession.status === ACTIVE_CALL_STATUS.CALLING ||
                    store.activeSession.status === ACTIVE_CALL_STATUS.CONNECTING
                ) {
                    store.setActiveCallStatus(ACTIVE_CALL_STATUS.ACTIVE);
                }
            }

            // 3. Отмена/Сброс/Завершение звонка любой из сторон
            if (
                record.status === CALL_STATUS.ENDED ||
                record.status === CALL_STATUS.REJECTED ||
                record.status === CALL_STATUS.MISSED
            ) {
                // Если закрывается входящий звонок из incomingSession — сбрасываем плашку
                if (
                    store.incomingSession &&
                    (store.incomingSession.callLogId === record.id ||
                        store.incomingSession.roomId === record.room)
                ) {
                    store.resetIncomingCallUI();
                }

                // Если закрывается текущий активный звонок — завершаем активную сессию
                if (
                    store.activeSession &&
                    (store.activeSession.roomName === record.room ||
                        store.activeSession.callLogId === record.id)
                ) {
                    store.endCall();
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [pbUser]);

    const activeSessionStatus = useCallStore(
        (state) => state.activeSession?.status,
    );

    // Fallback Polling (резервный опрос) для случаев падения SSE (502 Gateway / CORS)
    // biome-ignore lint/correctness/useExhaustiveDependencies: нужно перезапускать при смене статуса
    useEffect(() => {
        const store = useCallStore.getState();

        // Поллинг запускается только если мы инициаторы и висим в статусе CALLING или CONNECTING
        const shouldPoll =
            store.activeSession?.isInitiator &&
            store.activeSession?.callLogId &&
            (store.activeSession.status === ACTIVE_CALL_STATUS.CALLING ||
                store.activeSession.status === ACTIVE_CALL_STATUS.CONNECTING);

        if (!shouldPoll) {
            return;
        }

        const interval = setInterval(async () => {
            const currentStore = useCallStore.getState();
            const currentSession = currentStore.activeSession;
            if (!currentSession?.callLogId) {
                return;
            }

            try {
                const record = await callService.getCallLogById(
                    currentSession.callLogId,
                );

                // Если звонок принят собеседником
                if (record.status === CALL_STATUS.ONGOING) {
                    if (
                        currentSession.status === ACTIVE_CALL_STATUS.CALLING ||
                        currentSession.status === ACTIVE_CALL_STATUS.CONNECTING
                    ) {
                        currentStore.setActiveCallStatus(
                            ACTIVE_CALL_STATUS.ACTIVE,
                        );
                    }
                }
                // Если звонок завершен, сброшен или пропущен
                else if (
                    record.status === CALL_STATUS.ENDED ||
                    record.status === CALL_STATUS.REJECTED ||
                    record.status === CALL_STATUS.MISSED
                ) {
                    currentStore.endCall();
                }
            } catch (_error) {
                // Игнорируем ошибки сети при поллинге
            }
        }, 3000);

        return () => {
            clearInterval(interval);
        };
    }, [activeSessionStatus]); // перезапускаем эффект при смене статуса
}
