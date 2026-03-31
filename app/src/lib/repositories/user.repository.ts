/**
 * FUNCTIONAL USER REPOSITORY
 * Управляет получением данных пользователей, их профилей и статусов.
 */

import { DB_TABLES, ERROR_CODES, USER_FIELDS } from "../constants";
import { pb } from "../pocketbase";
import type {
    Profile,
    Result,
    UserRecord,
    UserRepoError,
    UserSecurityKeys,
    UserSort,
} from "../types";
import { appError, err, fromPromise, ok } from "../utils/result";
import { UserMapper } from "./mappers/userMapper";

export const userRepository = {
    /**
     * Получить всех пользователей системы
     */
    getAllUsers: async (): Promise<Result<Profile[], UserRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.USERS).getFullList<UserRecord>({
                sort: `-${USER_FIELDS.CREATED}`,
                $autoCancel: false,
            }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при получении списка пользователей",
                    e,
                ),
        ).then((res) =>
            res.map((records) =>
                records.map((r) =>
                    UserMapper.toDomain(r, (rec, file) =>
                        pb.files.getURL(rec, file),
                    ),
                ),
            ),
        );
    },

    /**
     * Получить данные одного пользователя по ID
     */
    getUserById: async (
        id: string,
    ): Promise<Result<Profile, UserRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.USERS).getOne<UserRecord>(id),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NOT_FOUND_ERROR,
                    `Пользователь ${id} не найден`,
                    e,
                ),
        ).then((res) =>
            res.map((record) =>
                UserMapper.toDomain(record, (rec, file) =>
                    pb.files.getURL(rec, file),
                ),
            ),
        );
    },

    /**
     * Найти пользователя по юзернейму
     */
    getByUsername: async (
        username: string,
    ): Promise<Result<Profile | null, UserRepoError>> => {
        const filter = `${USER_FIELDS.USERNAME} = "${username}"`;

        return fromPromise(
            pb.collection(DB_TABLES.USERS).getFirstListItem<UserRecord>(filter),
            (e: unknown): null | UserRepoError => {
                // PocketBase бросает 404 если ничего не найдено
                const error = e as { status?: number };
                if (error?.status === 404) {
                    return null;
                }
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    `Ошибка при поиске пользователя ${username}`,
                    e,
                );
            },
        ).then((res) => {
            if (res.isErr()) {
                // Если это наш маркер 404, возвращаем Ok(null)
                if (res.error === null) {
                    return ok(null);
                }
                // В остальных случаях возвращаем оригинальную ошибку
                return err(res.error);
            }
            // Если результат Ok, маппим его в Profile
            return ok(
                UserMapper.toDomain(res.value, (rec, file) =>
                    pb.files.getURL(rec, file),
                ),
            );
        });
    },

    /**
     * Получить профили пользователей по списку ID
     */
    getProfilesByIds: async (
        userIds: string[],
    ): Promise<
        Result<{ id: string; public_key_x25519: string }[], UserRepoError>
    > => {
        if (userIds.length === 0) {
            return ok([]);
        }

        const filter = userIds
            .map((id) => pb.filter(`${USER_FIELDS.ID} = "${id}"`))
            .join(" || ");

        return fromPromise(
            pb
                .collection(DB_TABLES.USERS)
                .getFullList<{ id: string; public_key_x25519: string }>({
                    filter,
                    fields: `${USER_FIELDS.ID},${USER_FIELDS.PUBLIC_KEY_X25519}`,
                }),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка получения профилей",
                    e,
                );
            },
        );
    },

    /**
     * Поиск пользователей
     */
    searchUsers: async (
        query: string,
        sort: UserSort = `-${USER_FIELDS.CREATED}` as UserSort,
    ): Promise<Result<Profile[], UserRepoError>> => {
        const filter = query
            ? `(${USER_FIELDS.USERNAME} ~ "${query}" || ${USER_FIELDS.DISPLAY_NAME} ~ "${query}")`
            : "";

        return fromPromise(
            pb
                .collection(DB_TABLES.USERS)
                .getFullList<UserRecord>({ filter, sort }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при поиске пользователей",
                    e,
                ),
        ).then((res) =>
            res.map((records) =>
                records.map((r) =>
                    UserMapper.toDomain(r, (rec, file) =>
                        pb.files.getURL(rec, file),
                    ),
                ),
            ),
        );
    },

    /**
     * Бан пользователя
     */
    banUser: async (
        userId: string,
        durationDays = 7,
    ): Promise<Result<Profile, UserRepoError>> => {
        const until = new Date();
        until.setDate(until.getDate() + durationDays);

        return fromPromise(
            pb.collection(DB_TABLES.USERS).update<UserRecord>(userId, {
                [USER_FIELDS.BANNED_UNTIL]: until.toISOString(),
            }),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    `Ошибка при бане пользователя ${userId}`,
                    e,
                );
            },
        ).then((res) =>
            res.map((record) =>
                UserMapper.toDomain(record, (rec, file) =>
                    pb.files.getURL(rec, file),
                ),
            ),
        );
    },

    /**
     * Разбан пользователя
     */
    unbanUser: async (
        userId: string,
    ): Promise<Result<Profile, UserRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.USERS).update<UserRecord>(userId, {
                [USER_FIELDS.BANNED_UNTIL]: null,
            }),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    `Ошибка при разбане пользователя ${userId}`,
                    e,
                );
            },
        ).then((res) =>
            res.map((record) =>
                UserMapper.toDomain(record, (rec, file) =>
                    pb.files.getURL(rec, file),
                ),
            ),
        );
    },

    /**
     * Получить публичные ключи пользователя
     */
    getSecurityKeys: async (
        userId: string,
    ): Promise<Result<UserSecurityKeys, UserRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.USERS).getOne<UserRecord>(userId, {
                fields: `${USER_FIELDS.PUBLIC_KEY_X25519},${USER_FIELDS.PUBLIC_KEY_SIGNING}`,
            }),
            (e) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка получения ключей безопасности",
                    e,
                ),
        ).then((res) =>
            res.map((value) => ({
                [USER_FIELDS.PUBLIC_KEY_X25519]:
                    value[USER_FIELDS.PUBLIC_KEY_X25519] || "",
                [USER_FIELDS.PUBLIC_KEY_SIGNING]:
                    value[USER_FIELDS.PUBLIC_KEY_SIGNING] || "",
            })),
        );
    },

    /**
     * Обновить публичные ключи пользователя
     */
    updateSecurityKeys: async (
        userId: string,
        x25519: string,
        signing: string,
    ): Promise<Result<void, UserRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.USERS).update(userId, {
                [USER_FIELDS.PUBLIC_KEY_X25519]: x25519,
                [USER_FIELDS.PUBLIC_KEY_SIGNING]: signing,
            }),
            (e) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка обновления ключей безопасности",
                    e,
                ),
        ).then((res) => res.map(() => undefined));
    },

    /**
     * Обновить профиль пользователя (username, display_name)
     */
    updateProfile: async (
        userId: string,
        data: { username?: string; display_name?: string },
    ): Promise<Result<Profile, UserRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.USERS).update<UserRecord>(userId, data),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при обновлении профиля",
                    e,
                ),
        ).then((res) =>
            res.map((record) =>
                UserMapper.toDomain(record, (rec, file) =>
                    pb.files.getURL(rec, file),
                ),
            ),
        );
    },
};
