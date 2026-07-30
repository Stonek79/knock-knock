import { logger } from "@/lib/logger";
import { callService } from "@/lib/services/call.service";
import type { CallStateCreator, LogsSlice } from "./types";

/**
 * Zustand слайс управления историей вызовов
 */
export const createLogsSlice: CallStateCreator<LogsSlice> = (set) => ({
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
});
