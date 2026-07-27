import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CALL_STATUS, QUERY_KEYS } from "@/lib/constants";
import { callService } from "@/lib/services/call.service";
import type { RoomWithMembers } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";
import { useCallStore } from "../store";

/**
 * Хук для прослушивания входящих звонков по WebSocket.
 * Выступает как дублирующий канал на случай, если Push-уведомления не работают (например, в публичной сети или dev-режиме).
 */
export function useCallRealtime() {
    const pbUser = useAuthStore((state) => state.pbUser);
    const queryClient = useQueryClient();

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

            // Проверяем, есть ли текущий пользователь в комнате
            const rooms =
                queryClient.getQueryData<RoomWithMembers[]>(
                    QUERY_KEYS.rooms(pbUser.id),
                ) || [];
            const isUserInRoom = rooms.some((r) => r.id === record.room);

            if (isUserInRoom) {
                useCallStore
                    .getState()
                    .setIncomingCall(record.room, record.id, record.type);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [pbUser, queryClient]);
}
