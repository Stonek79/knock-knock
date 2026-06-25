/**
 * REPOSITORY: BROADCAST
 * Управляет системными рассылками (Broadcast) через API.
 */

import type { ListResult } from "pocketbase";
import { API_ROUTES, ERROR_CODES } from "../constants";
import { pb } from "../pocketbase";
import type { BroadcastRepoError, Result } from "../types";
import type { TaskQueueResponse } from "../types/pocketbase-types";
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
        attachmentIds: string[] = [],
    ): Promise<Result<void, BroadcastRepoError>> => {
        return fromPromise(
            pb.send(API_ROUTES.BROADCAST_SEND, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text, attachments: attachmentIds }),
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

    /**
     * Получить историю рассылок через кастомный эндпоинт.
     * Прямой доступ к коллекции task_queue закрыт правилами PocketBase (403),
     * поэтому используем серверный хук с проверкой роли admin.
     */
    getBroadcastHistory: async (): Promise<
        Result<ListResult<TaskQueueResponse>, BroadcastRepoError>
    > => {
        return fromPromise(
            pb.send<ListResult<TaskQueueResponse>>(
                API_ROUTES.BROADCAST_HISTORY,
                {
                    method: "GET",
                },
            ),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось загрузить историю рассылок",
                    e,
                ),
        );
    },

    /**
     * Удалить/отозвать рассылку
     */
    deleteBroadcast: async (
        broadcastId: string,
    ): Promise<Result<void, BroadcastRepoError>> => {
        return fromPromise(
            pb.send(API_ROUTES.BROADCAST_DELETE(broadcastId), {
                method: "DELETE",
            }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось удалить рассылку",
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
