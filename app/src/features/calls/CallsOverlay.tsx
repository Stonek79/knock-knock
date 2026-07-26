import { useEffect } from "react";
import type { CallLogsTypeOptions } from "@/lib/types";
import { CallRoom } from "./CallRoom";
import { IncomingCallAlert } from "./IncomingCallAlert";
import { useCallStore } from "./store";

export const PUSH_MESSAGE_TYPE = {
    CALL_INCOMING: "call_incoming",
} as const;

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
