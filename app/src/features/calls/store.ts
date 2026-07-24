import { create } from "zustand";
import { logger } from "@/lib/logger";
import { callService } from "@/lib/services/call.service";

/**
 * Интерфейс состояния магазина звонков.
 */
export interface CallState {
    isActive: boolean;
    isIncoming: boolean;
    incomingRoomId: string | null;
    incomingCallLogId: string | null;
    roomName: string | null;
    token: string | null;
    serverUrl: string | null;
    startCall: (roomName: string, token: string, serverUrl?: string) => void;
    endCall: () => void;
    setIncomingCall: (roomId: string, callLogId: string) => void;
    rejectCall: () => void;
    acceptCall: () => Promise<void>;
    initiateCall: (roomId: string) => Promise<void>;
}

/**
 * Zustand store для управления состоянием видеоконференций (LiveKit).
 */
export const useCallStore = create<CallState>((set, get) => ({
    isActive: false,
    isIncoming: false,
    incomingRoomId: null,
    incomingCallLogId: null,
    roomName: null,
    token: null,
    serverUrl: null,

    startCall: (roomName, token, serverUrl = "wss://whoami.ninja/livekit/") =>
        set({ isActive: true, isIncoming: false, roomName, token, serverUrl }),

    endCall: () =>
        set({
            isActive: false,
            roomName: null,
            token: null,
            serverUrl: null,
            isIncoming: false,
            incomingRoomId: null,
            incomingCallLogId: null,
        }),

    setIncomingCall: (roomId, callLogId) =>
        set({
            isIncoming: true,
            incomingRoomId: roomId,
            incomingCallLogId: callLogId,
        }),

    rejectCall: () =>
        set({
            isIncoming: false,
            incomingRoomId: null,
            incomingCallLogId: null,
        }),

    acceptCall: async () => {
        const { incomingRoomId } = get();
        if (!incomingRoomId) {
            return;
        }

        try {
            const res = await callService.getToken(incomingRoomId);

            if (res.token) {
                get().startCall(incomingRoomId, res.token);
            }
        } catch (error) {
            logger.error("Ошибка при принятии звонка", error);
            get().rejectCall();
        }
    },

    initiateCall: async (roomId) => {
        try {
            const res = await callService.getToken(roomId);

            if (res.token) {
                get().startCall(roomId, res.token);
            }
        } catch (error) {
            logger.error("Ошибка при инициировании звонка", error);
        }
    },
}));
