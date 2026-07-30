import { ACTIVE_CALL_STATUS } from "@/lib/constants/calls";
import { CALL_STATUS, CALL_TYPE } from "@/lib/constants/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { callService } from "@/lib/services/call.service";
import type { CallStateCreator, SessionSlice } from "./types";

/**
 * Zustand слайс управления сессиями звонков (FSM + Media)
 */
export const createSessionSlice: CallStateCreator<SessionSlice> = (
    set,
    get,
) => ({
    activeSession: null,
    incomingSession: null,
    isMutedRingtone: false,

    startCall: (
        roomName,
        token,
        callType,
        serverUrl = env.VITE_LIVEKIT_URL,
        callLogId,
        isInitiator = false,
    ) => {
        set({
            activeSession: {
                status: ACTIVE_CALL_STATUS.CONNECTING,
                type: callType,
                isInitiator,
                roomName,
                token,
                serverUrl,
                callLogId: callLogId ?? null,
                isMuted: false,
                isVideoMuted: callType === CALL_TYPE.AUDIO,
                isScreenSharing: false,
            },
            incomingSession: null,
        });
    },

    setActiveCallStatus: (status) => {
        set((state) => {
            if (!state.activeSession) {
                return {};
            }
            return {
                activeSession: {
                    ...state.activeSession,
                    status,
                },
            };
        });
    },

    toggleMute: () => {
        set((state) => {
            if (!state.activeSession) {
                return {};
            }
            return {
                activeSession: {
                    ...state.activeSession,
                    isMuted: !state.activeSession.isMuted,
                },
            };
        });
    },

    toggleVideoMuted: () => {
        set((state) => {
            if (!state.activeSession) {
                return {};
            }
            const isVideoMuted = !state.activeSession.isVideoMuted;
            const newType =
                !isVideoMuted && state.activeSession.type === CALL_TYPE.AUDIO
                    ? CALL_TYPE.VIDEO
                    : state.activeSession.type;

            return {
                activeSession: {
                    ...state.activeSession,
                    isVideoMuted,
                    type: newType,
                },
            };
        });
    },

    toggleScreenSharing: () => {
        set((state) => {
            if (!state.activeSession) {
                return {};
            }
            return {
                activeSession: {
                    ...state.activeSession,
                    isScreenSharing: !state.activeSession.isScreenSharing,
                },
            };
        });
    },

    endCall: () => {
        const { activeSession, fetchCallLogs } = get();
        if (activeSession?.callLogId) {
            callService
                .updateCallStatus(activeSession.callLogId, CALL_STATUS.ENDED)
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
            activeSession: null,
            incomingSession: null,
            isMutedRingtone: false,
        });
    },

    setIncomingCall: (roomId, callLogId, callType = CALL_TYPE.VIDEO) => {
        set({
            incomingSession: {
                roomId,
                callLogId,
                type: callType,
            },
            isMutedRingtone: false,
        });
    },

    resetIncomingCallUI: () => {
        set({
            incomingSession: null,
            isMutedRingtone: false,
        });
    },

    toggleMuteRingtone: () => {
        set((state) => ({
            isMutedRingtone: !state.isMutedRingtone,
        }));
    },

    rejectCall: () => {
        const { incomingSession, fetchCallLogs } = get();
        if (incomingSession?.callLogId) {
            callService
                .updateCallStatus(
                    incomingSession.callLogId,
                    CALL_STATUS.REJECTED,
                )
                .then(() => {
                    fetchCallLogs();
                })
                .catch((e: unknown) => {
                    logger.error("Ошибка при отклонении звонка", e);
                });
        }
        set({
            incomingSession: null,
            isMutedRingtone: false,
        });
    },

    missCall: () => {
        const { incomingSession, fetchCallLogs } = get();
        if (incomingSession?.callLogId) {
            callService
                .updateCallStatus(incomingSession.callLogId, CALL_STATUS.MISSED)
                .then(() => {
                    fetchCallLogs();
                })
                .catch((e: unknown) => {
                    logger.error("Ошибка при отметке пропущенного звонка", e);
                });
        }
        set({
            incomingSession: null,
            isMutedRingtone: false,
        });
    },

    acceptCall: async () => {
        const { incomingSession, fetchCallLogs } = get();
        if (!incomingSession) {
            return;
        }

        const { roomId, callLogId, type } = incomingSession;

        try {
            const res = await callService.getToken(
                roomId,
                type,
                true,
                callLogId,
            );

            if (callLogId) {
                fetchCallLogs();
            }

            if (res.token) {
                set({
                    activeSession: {
                        status: ACTIVE_CALL_STATUS.CONNECTING,
                        type,
                        isInitiator: false,
                        roomName: roomId,
                        token: res.token,
                        serverUrl: env.VITE_LIVEKIT_URL,
                        callLogId: res.callLogId || callLogId,
                        isMuted: false,
                        isVideoMuted: type === CALL_TYPE.AUDIO,
                        isScreenSharing: false,
                    },
                    incomingSession: null,
                });
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
        set({
            activeSession: {
                status: ACTIVE_CALL_STATUS.INITIATING,
                type: callType,
                isInitiator: true,
                roomName: roomId,
                token: null,
                serverUrl: env.VITE_LIVEKIT_URL,
                callLogId: null,
                isMuted: false,
                isVideoMuted: callType === CALL_TYPE.AUDIO,
                isScreenSharing: false,
            },
        });

        try {
            const res = await callService.getToken(roomId, callType);

            if (res.token) {
                set({
                    activeSession: {
                        status: ACTIVE_CALL_STATUS.CALLING,
                        type: callType,
                        isInitiator: true,
                        roomName: roomId,
                        token: res.token,
                        serverUrl: env.VITE_LIVEKIT_URL,
                        callLogId: res.callLogId || null,
                        isMuted: false,
                        isVideoMuted: callType === CALL_TYPE.AUDIO,
                        isScreenSharing: false,
                    },
                });
            }
        } catch (error) {
            logger.error("Ошибка при инициировании звонка", error);
            set({ activeSession: null });
            throw error;
        }
    },
});
