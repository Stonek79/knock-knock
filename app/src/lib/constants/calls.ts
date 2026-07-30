/**
 * Константы для состояния аудио-контекста Web Audio API
 */
export const AUDIO_CONTEXT_STATE = {
    RUNNING: "running",
    SUSPENDED: "suspended",
    CLOSED: "closed",
} as const;

/**
 * Константы FSM статусов активного вызова
 */
export const ACTIVE_CALL_STATUS = {
    INITIATING: "INITIATING",
    CALLING: "CALLING",
    CONNECTING: "CONNECTING",
    ACTIVE: "ACTIVE",
    RECONNECTING: "RECONNECTING",
} as const;
