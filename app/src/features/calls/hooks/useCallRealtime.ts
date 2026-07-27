import { useEffect } from "react";
import { CALL_STATUS } from "@/lib/constants";
import { callService } from "@/lib/services/call.service";
import { useAuthStore } from "@/stores/auth";
import { useCallStore } from "../store";

/**
 * Хук для прослушивания событий звонков по WebSocket (PocketBase SSE / Event Bus).
 * Обеспечивает мгновенный отклик на входящие вызовы, а также автоматическое
 * завершение звонка при отмене, сбросе или завершении собеседником.
 */
export function useCallRealtime() {
    const pbUser = useAuthStore((state) => state.pbUser);

    useEffect(() => {
        if (!pbUser) {
            return;
        }

        const unsubscribe = callService.subscribeToIncomingCalls((record) => {
            const store = useCallStore.getState();

            // 1. Входящий звонок
            if (
                record.status === CALL_STATUS.RINGING &&
                record.initiator !== pbUser.id
            ) {
                store.setIncomingCall(record.room, record.id, record.type);
                return;
            }

            // 2. Отмена/Сброс/Завершение звонка любой из сторон
            if (
                record.status === CALL_STATUS.ENDED ||
                record.status === CALL_STATUS.REJECTED ||
                record.status === CALL_STATUS.MISSED
            ) {
                // Если у нас открыт оверлей входящего звонка для этой комнаты/записи — закрываем его
                if (
                    store.isIncoming &&
                    (store.incomingCallLogId === record.id ||
                        store.incomingRoomId === record.room)
                ) {
                    store.rejectCall();
                }

                // Если у нас активен режим звонка/конференции в этой комнате — завершаем его
                if (store.isActive && store.roomName === record.room) {
                    store.endCall();
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [pbUser]);
}
