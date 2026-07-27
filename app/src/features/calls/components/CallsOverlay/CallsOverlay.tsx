import { useEffect } from "react";
import { PUSH_MESSAGE_TYPE } from "@/lib/constants";
import type { CallLogsTypeOptions } from "@/lib/types";
import { useCallRealtime } from "../../hooks/useCallRealtime";
import { useCallStore } from "../../store";
import { CallRoom } from "../CallRoom/CallRoom";
import { IncomingCallAlert } from "../IncomingCallAlert/IncomingCallAlert";

interface CallIncomingData {
    type: typeof PUSH_MESSAGE_TYPE.CALL_INCOMING;
    roomId: string;
    callLogId: string;
    callType: CallLogsTypeOptions;
}

interface ServiceWorkerMessageEvent extends MessageEvent {
    data: CallIncomingData;
}

/**
 * Оверлей звонков (LiveKit).
 * Подписывается на входящие звонки от Service Worker и отображает UI звонков.
 * Должен быть подключен в AppLayout, чтобы работать только для авторизованных пользователей.
 */
export function CallsOverlay() {
    // Дублирующий канал WebSocket для входящих звонков
    useCallRealtime();

    useEffect(() => {
        if ("serviceWorker" in navigator) {
            const handleMessage = (event: ServiceWorkerMessageEvent) => {
                if (event.data?.type === PUSH_MESSAGE_TYPE.CALL_INCOMING) {
                    useCallStore
                        .getState()
                        .setIncomingCall(
                            event.data.roomId,
                            event.data.callLogId,
                            event.data.callType,
                        );
                }
            };

            navigator.serviceWorker.addEventListener(
                "message",
                handleMessage as EventListener,
            );
            return () => {
                navigator.serviceWorker.removeEventListener(
                    "message",
                    handleMessage as EventListener,
                );
            };
        }
    }, []);

    return (
        <>
            <CallRoom />
            <IncomingCallAlert />
        </>
    );
}
