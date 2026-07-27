import { useEffect } from "react";
import { CALL_STATUS } from "@/lib/constants";
import { callService } from "@/lib/services/call.service";
import { useAuthStore } from "@/stores/auth";
import { useCallStore } from "../store";

/**
 * Хук для прослушивания входящих звонков по WebSocket (PocketBase SSE / Event Bus).
 * Выступает как надежный реалтайм-канал для показа входящих звонков.
 * Серверное RLS-правило PocketBase гарантирует, что события вызова доходят только участникам комнаты.
 */
export function useCallRealtime() {
    const pbUser = useAuthStore((state) => state.pbUser);

    useEffect(() => {
        if (!pbUser) {
            return;
        }

        const unsubscribe = callService.subscribeToIncomingCalls((record) => {
            // Игнорируем свои же звонки или если статус не 'ringing'
            if (
                record.status !== CALL_STATUS.RINGING ||
                record.initiator === pbUser.id
            ) {
                return;
            }

            // Мгновенно активируем оверлей входящего вызова у принимающего
            useCallStore
                .getState()
                .setIncomingCall(record.room, record.id, record.type);
        });

        return () => {
            unsubscribe();
        };
    }, [pbUser]);
}
