import { callRepository } from "../repositories/call.repository";
import type { CallLogsTypeOptions } from "../types";

/**
 * Сервис для работы со звонками.
 */
export const callService = {
    /**
     * Получает токен для комнаты.
     * @param roomId - Идентификатор комнаты
     * @param callType - Тип звонка (аудио/видео)
     * @returns Токен для подключения к LiveKit
     */
    async getToken(
        roomId: string,
        callType: CallLogsTypeOptions,
    ): Promise<{ token: string }> {
        return await callRepository.getToken(roomId, callType);
    },
};
