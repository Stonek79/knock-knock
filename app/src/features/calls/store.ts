import { create } from "zustand";
import { createLogsSlice } from "./store/logsSlice";
import { createSessionSlice } from "./store/sessionSlice";
import type { CallState } from "./store/types";

export type { CallState, LogsSlice, SessionSlice } from "./store/types";

/**
 * Zustand store для управления состоянием WebRTC видеоконференций и истории вызовов.
 * Компонируется из слайсов createSessionSlice и createLogsSlice.
 */
export const useCallStore = create<CallState>()((...args) => ({
    ...createSessionSlice(...args),
    ...createLogsSlice(...args),
}));
