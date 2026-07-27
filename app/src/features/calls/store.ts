import { create } from "zustand";
import { CALL_STATUS, CALL_TYPE } from "@/lib/constants";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { callService } from "@/lib/services/call.service";
import type { CallLogsTypeOptions } from "@/lib/types";

/**
 * Интерфейс состояния магазина звонков.
 */
export interface CallState {
    isActive: boolean;
    isIncoming: boolean;
    incomingRoomId: string | null;
    incomingCallLogId: string | null;
    callType: CallLogsTypeOptions | null;
    roomName: string | null;
    token: string | null;
    serverUrl: string | null;
    startCall: (
        roomName: string,
        token: string,
        callType: CallLogsTypeOptions,
        serverUrl?: string,
    ) => void;
    endCall: () => void;
    setIncomingCall: (
        roomId: string,
        callLogId: string,
        callType?: CallLogsTypeOptions,
    ) => void;
    rejectCall: () => void;
    acceptCall: () => Promise<void>;
    initiateCall: (
        roomId: string,
        callType: CallLogsTypeOptions,
    ) => Promise<void>;
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
    callType: null,
    serverUrl: null,

    startCall: (roomName, token, callType, serverUrl = env.VITE_LIVEKIT_URL) =>
        set({
            isActive: true,
            isIncoming: false,
            roomName,
            token,
            callType,
            serverUrl,
        }),

    endCall: () => {
        const { incomingCallLogId } = get();
        if (incomingCallLogId) {
            callService
                .updateCallStatus(incomingCallLogId, CALL_STATUS.ENDED)
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
            incomingRoomId: null,
            incomingCallLogId: null,
        });
    },

    setIncomingCall: (roomId, callLogId, callType = CALL_TYPE.VIDEO) =>
        set({
            isIncoming: true,
            incomingRoomId: roomId,
            incomingCallLogId: callLogId,
            callType,
        }),

    rejectCall: () => {
        const { incomingCallLogId } = get();
        if (incomingCallLogId) {
            callService
                .updateCallStatus(incomingCallLogId, CALL_STATUS.REJECTED)
                .catch((e: unknown) => {
                    logger.error("Ошибка при отклонении звонка", e);
                });
        }
        set({
            isIncoming: false,
            incomingRoomId: null,
            incomingCallLogId: null,
        });
    },

    acceptCall: async () => {
        const { incomingRoomId, incomingCallLogId, callType } = get();
        if (!incomingRoomId) {
            return;
        }

        try {
            if (incomingCallLogId) {
                callService
                    .updateCallStatus(incomingCallLogId, CALL_STATUS.ONGOING)
                    .catch(() => {});
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
                );
            }
        } catch (error) {
            logger.error("Ошибка при принятии звонка", error);
            get().rejectCall();
            throw error;
        }
    },

    initiateCall: async (roomId, callType) => {
        try {
            const res = await callService.getToken(roomId, callType);

            if (res.token) {
                get().startCall(roomId, res.token, callType);
            }
        } catch (error) {
            logger.error("Ошибка при инициировании звонка", error);
            throw error;
        }
    },
}));
