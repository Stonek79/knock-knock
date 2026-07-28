import { create } from "zustand";
import { CALL_STATUS, CALL_TYPE } from "@/lib/constants";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { callService } from "@/lib/services/call.service";
import type {
    CallLogsResponse,
    CallLogsTypeOptions,
    RoomsResponse,
} from "@/lib/types";

/**
 * Интерфейс состояния магазина звонков (FSM) и истории вызовов.
 */
export interface CallState {
    isActive: boolean;
    isIncoming: boolean;
    isMutedRingtone: boolean;
    incomingRoomId: string | null;
    incomingCallLogId: string | null;
    callType: CallLogsTypeOptions | null;
    roomName: string | null;
    token: string | null;
    serverUrl: string | null;

    // Стор истории звонков
    callLogs: CallLogsResponse<{ room?: RoomsResponse }>[];
    loadingCallLogs: boolean;
    fetchCallLogs: () => Promise<void>;

    startCall: (
        roomName: string,
        token: string,
        callType: CallLogsTypeOptions,
        serverUrl?: string,
        callLogId?: string,
    ) => void;
    endCall: () => void;
    setIncomingCall: (
        roomId: string,
        callLogId: string,
        callType?: CallLogsTypeOptions,
    ) => void;
    rejectCall: () => void;
    resetIncomingCallUI: () => void;
    toggleMuteRingtone: () => void;
    acceptCall: () => Promise<void>;
    endAndAcceptCall: () => Promise<void>;
    initiateCall: (
        roomId: string,
        callType: CallLogsTypeOptions,
    ) => Promise<void>;
}

/**
 * Zustand store для управления состоянием WebRTC видеоконференций и истории вызовов.
 */
export const useCallStore = create<CallState>((set, get) => ({
    isActive: false,
    isIncoming: false,
    isMutedRingtone: false,
    incomingRoomId: null,
    incomingCallLogId: null,
    roomName: null,
    token: null,
    callType: null,
    serverUrl: null,

    callLogs: [],
    loadingCallLogs: true,

    fetchCallLogs: async () => {
        set({ loadingCallLogs: true });
        try {
            const logs = await callService.getCallLogs();
            set({ callLogs: logs, loadingCallLogs: false });
        } catch (error: unknown) {
            logger.error("Ошибка при получении истории звонков", error);
            set({ loadingCallLogs: false });
        }
    },

    startCall: (
        roomName,
        token,
        callType,
        serverUrl = env.VITE_LIVEKIT_URL,
        callLogId,
    ) =>
        set((state) => ({
            isActive: true,
            isIncoming: false,
            roomName,
            token,
            callType,
            serverUrl,
            incomingCallLogId: callLogId ?? state.incomingCallLogId,
        })),

    endCall: () => {
        const { incomingCallLogId, fetchCallLogs } = get();
        if (incomingCallLogId) {
            callService
                .updateCallStatus(incomingCallLogId, CALL_STATUS.ENDED)
                .then(() => {
                    fetchCallLogs();
                })
                .catch((e: unknown) => {
                    logger.error(
                        "Ошибка при обновлении статуса завершения звонка",
                        e,
                    );
                });
        }
        set({
            isActive: false,
            roomName: null,
            token: null,
            callType: null,
            serverUrl: null,
            isIncoming: false,
            isMutedRingtone: false,
            incomingRoomId: null,
            incomingCallLogId: null,
        });
    },

    setIncomingCall: (roomId, callLogId, callType = CALL_TYPE.VIDEO) =>
        set({
            isIncoming: true,
            isMutedRingtone: false,
            incomingRoomId: roomId,
            incomingCallLogId: callLogId,
            callType,
        }),

    resetIncomingCallUI: () =>
        set({
            isIncoming: false,
            isMutedRingtone: false,
            incomingRoomId: null,
            incomingCallLogId: null,
        }),

    toggleMuteRingtone: () =>
        set((state) => ({
            isMutedRingtone: !state.isMutedRingtone,
        })),

    rejectCall: () => {
        const { incomingCallLogId, fetchCallLogs } = get();
        if (incomingCallLogId) {
            callService
                .updateCallStatus(incomingCallLogId, CALL_STATUS.REJECTED)
                .then(() => {
                    fetchCallLogs();
                })
                .catch((e: unknown) => {
                    logger.error("Ошибка при отклонении звонка", e);
                });
        }
        get().resetIncomingCallUI();
    },

    acceptCall: async () => {
        const { incomingRoomId, incomingCallLogId, callType, fetchCallLogs } =
            get();
        if (!incomingRoomId) {
            return;
        }

        try {
            if (incomingCallLogId) {
                callService
                    .updateCallStatus(incomingCallLogId, CALL_STATUS.ONGOING)
                    .then(() => {
                        fetchCallLogs();
                    })
                    .catch((e: unknown) => {
                        logger.error(
                            "Ошибка при обновлении статуса принятого звонка",
                            e,
                        );
                    });
            }

            const res = await callService.getToken(
                incomingRoomId,
                callType || CALL_TYPE.VIDEO,
            );

            if (res.token) {
                get().startCall(
                    incomingRoomId,
                    res.token,
                    callType || CALL_TYPE.VIDEO,
                    env.VITE_LIVEKIT_URL,
                    res.callLogId,
                );
            }
        } catch (error) {
            logger.error("Ошибка при принятии звонка", error);
            get().rejectCall();
            throw error;
        }
    },

    endAndAcceptCall: async () => {
        get().endCall();
        await get().acceptCall();
    },

    initiateCall: async (roomId, callType) => {
        try {
            const res = await callService.getToken(roomId, callType);

            if (res.token) {
                get().startCall(
                    roomId,
                    res.token,
                    callType,
                    env.VITE_LIVEKIT_URL,
                    res.callLogId,
                );
            }
        } catch (error) {
            logger.error("Ошибка при инициировании звонка", error);
            throw error;
        }
    },
}));
