/**
 * REPOSITORY: INVITE
 * Управляет генерацией инвайт-кодов для приглашения новых пользователей.
 */

import { API_ROUTES, ERROR_CODES } from "../constants";
import { pb } from "../pocketbase";
import type { InviteRepoError, Result } from "../types";
import { appError, err, fromPromise, ok } from "../utils/result";

export const inviteRepository = {
    /**
     * Сгенерировать новый код приглашения
     *
     * @returns Result с объектом кода или ошибкой
     */
    generateInvite: async (): Promise<
        Result<{ code: string }, InviteRepoError>
    > => {
        return fromPromise(
            pb.send<{ code: string }>(API_ROUTES.INVITES_GENERATE, {
                method: "POST",
            }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при генерации инвайта",
                    e,
                ),
        ).then((res) => {
            if (res.isErr()) {
                return err(res.error);
            }
            return ok(res.value);
        });
    },
};
