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

function isCallIncomingData(data: unknown): data is CallIncomingData {
    if (typeof data !== "object" || data === null) {
        return false;
    }
    return (
        "type" in data &&
        data.type === PUSH_MESSAGE_TYPE.CALL_INCOMING &&
        "roomId" in data &&
        typeof data.roomId === "string" &&
        "callLogId" in data &&
        typeof data.callLogId === "string"
    );
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
            const handleMessage = (event: MessageEvent) => {
                if (isCallIncomingData(event.data)) {
                    useCallStore
                        .getState()
                        .setIncomingCall(
                            event.data.roomId,
                            event.data.callLogId,
                            event.data.callType,
                        );
                }
            };

            navigator.serviceWorker.addEventListener("message", handleMessage);
            return () => {
                navigator.serviceWorker.removeEventListener(
                    "message",
                    handleMessage,
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
