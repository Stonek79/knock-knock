/**
 * REPOSITORY: BROADCAST
 * Управляет системными рассылками (Broadcast) через API.
 */

import { API_ROUTES, ERROR_CODES } from "../constants";
import { pb } from "../pocketbase";
import type { BroadcastRepoError, Result } from "../types";
import { appError, err, fromPromise, ok } from "../utils/result";

export const broadcastRepository = {
    /**
     * Отправить глобальную рассылку всем пользователям.
     *
     * @param text Текст рассылки
     * @returns Result с успешным статусом или ошибкой
     */
    sendBroadcast: async (
        text: string,
    ): Promise<Result<void, BroadcastRepoError>> => {
        return fromPromise(
            pb.send(API_ROUTES.BROADCAST_SEND, {
                method: "POST",
                body: { text },
            }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при отправке рассылки",
                    e,
                ),
        ).then((res) => {
            if (res.isErr()) {
                return err(res.error);
            }
            return ok(undefined);
        });
    },
};
