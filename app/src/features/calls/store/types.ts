import type { StateCreator } from "zustand";
import type {
    ActiveCallSession,
    ActiveCallStatus,
    CallLogsResponse,
    CallLogsTypeOptions,
    IncomingCallSession,
    RoomsResponse,
} from "@/lib/types";

/**
 * Интерфейс слайса сессий звонков (FSM + Media)
 */
export interface SessionSlice {
    activeSession: ActiveCallSession | null;
    incomingSession: IncomingCallSession | null;
    isMutedRingtone: boolean;

    startCall: (
        roomName: string,
        token: string,
        callType: CallLogsTypeOptions,
        serverUrl?: string,
        callLogId?: string,
        isInitiator?: boolean,
    ) => void;
    setActiveCallStatus: (status: ActiveCallStatus) => void;
    toggleMute: () => void;
    toggleVideoMuted: () => void;
    toggleScreenSharing: () => void;
    endCall: () => void;
    setIncomingCall: (
        roomId: string,
        callLogId: string,
        callType?: CallLogsTypeOptions,
    ) => void;
    rejectCall: () => void;
    missCall: () => void;
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
 * Интерфейс слайса истории вызовов
 */
export interface LogsSlice {
    callLogs: CallLogsResponse<{ room?: RoomsResponse }>[];
    loadingCallLogs: boolean;
    fetchCallLogs: () => Promise<void>;
}

/**
 * Объединенный тип общего хранилища звонков
 */
export type CallState = SessionSlice & LogsSlice;

/**
 * Тип функции создания слайса Zustand
 */
export type CallStateCreator<T> = StateCreator<CallState, [], [], T>;
