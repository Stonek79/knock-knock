/**
 * SERVICE: BROADCAST
 * Бизнес-логика для работы с системными рассылками.
 */

import { broadcastRepository } from "../repositories/broadcast.repository";
import type { BroadcastRepoError, Result } from "../types";

export const broadcastService = {
    /**
     * Отправить глобальную рассылку всем пользователям.
     *
     * @param text Текст рассылки
     * @returns Result с успешным статусом или ошибкой
     */
    sendBroadcast: async (
        text: string,
    ): Promise<Result<void, BroadcastRepoError>> => {
        return broadcastRepository.sendBroadcast(text);
    },
};
