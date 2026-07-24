import { callRepository } from "../repositories/call.repository";

/**
 * Сервис для работы со звонками.
 */
export const callService = {
    /**
     * Получает токен для комнаты.
     * @param roomId - Идентификатор комнаты
     * @returns Токен для подключения к LiveKit
     */
    async getToken(roomId: string): Promise<{ token: string }> {
        return await callRepository.getToken(roomId);
    },
};
