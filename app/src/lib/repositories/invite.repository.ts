/**
 * REPOSITORY: INVITE
 * Управляет инвайт-ссылками (токенами) для комнат.
 */

import { API_ROUTES, DB_TABLES, ERROR_CODES } from "../constants";
import { pb } from "../pocketbase";
import type { InviteRepoError, Result } from "../types";
import type { InvitesRecord, InvitesResponse } from "../types/pocketbase-types";
import { appError, err, fromPromise, ok } from "../utils/result";

export const inviteRepository = {
    /**
     * Сгенерировать новый код приглашения для пользователя.
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

    /**
     * Создать новый инвайт для комнаты.
     * @param data Данные инвайта
     */
    createInvite: async (
        data: InvitesRecord,
    ): Promise<Result<InvitesResponse, InviteRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.INVITES).create<InvitesResponse>(data),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при создании инвайта",
                    e,
                ),
        ).then((res) => {
            if (res.isErr()) {
                return err(res.error);
            }
            return ok(res.value);
        });
    },

    /**
     * Получить информацию об инвайте по его токену.
     * (Используется на странице /join/:token)
     * @param token Уникальный токен
     */
    getInviteByToken: async <T = unknown>(
        token: string,
    ): Promise<Result<InvitesResponse<T>, InviteRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.INVITES)
                .getFirstListItem<InvitesResponse<T>>(
                    pb.filter("token = {:token}", { token }),
                    { expand: "room,created_by" },
                ),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NOT_FOUND_ERROR,
                    "Инвайт не найден или недействителен",
                    e,
                ),
        ).then((res) => {
            if (res.isErr()) {
                return err(res.error);
            }
            return ok(res.value);
        });
    },

    /**
     * Удалить инвайт.
     * @param id ID инвайта
     */
    deleteInvite: async (
        id: string,
    ): Promise<Result<boolean, InviteRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.INVITES).delete(id),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при удалении инвайта",
                    e,
                ),
        ).then((res) => {
            if (res.isErr()) {
                return err(res.error);
            }
            return ok(true);
        });
    },

    /**
     * Вызывает кастомный RPC эндпоинт для безопасного вступления в комнату
     * @param token Уникальный токен инвайта
     * @param roomKeyEncrypted Зашифрованный мастер-ключ комнаты
     */
    joinRoom: async (
        token: string,
        roomKeyEncrypted: string,
    ): Promise<Result<boolean, InviteRepoError>> => {
        return fromPromise(
            pb.send(API_ROUTES.INVITES_JOIN, {
                method: "POST",
                body: {
                    token,
                    roomKeyEncrypted,
                },
            }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при вступлении в комнату. Возможно, ссылка недействительна.",
                    e,
                ),
        ).then((res) => {
            if (res.isErr()) {
                return err(res.error);
            }
            return ok(true);
        });
    },
};
