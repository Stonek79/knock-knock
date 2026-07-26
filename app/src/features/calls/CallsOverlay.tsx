import { useEffect } from "react";
import { CallRoom } from "./CallRoom";
import { IncomingCallAlert } from "./IncomingCallAlert";
import { useCallStore } from "./store";

/**
 * Оверлей звонков (LiveKit).
 * Подписывается на входящие звонки от Service Worker и отображает UI звонков.
 * Должен быть подключен в AppLayout, чтобы работать только для авторизованных пользователей.
 */
export function CallsOverlay() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            const handleMessage = (event: MessageEvent) => {
                if (event.data && event.data.type === "call_incoming") {
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
