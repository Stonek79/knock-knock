/**
 * FUNCTIONAL USER REPOSITORY
 * Управляет получением данных пользователей, их профилей и статусов.
 */

import {
    API_ROUTES,
    DB_TABLES,
    ERROR_CODES,
    MAX_USER_SECURITY_KEYS_PER_REQUEST,
    USER_FIELDS,
} from "../constants";
import { pb } from "../pocketbase";
import type {
    Profile,
    ProfileSecurityKeyDto,
    Result,
    UserRecord,
    UserRepoError,
    UserSecurityKeys,
    UserSort,
} from "../types";
import { appError, err, fromPromise, ok } from "../utils/result";
import {
    parseAdminUserResponse,
    parseContactProfileResponse,
    parseOwnSecurityKeyState,
    parsePublicProfileSearchResponse,
    parseSecurityKeyResponse,
    UserDtoMapper,
} from "./mappers/userDtoMapper";
import { UserMapper } from "./mappers/userMapper";

export const userRepository = {
    /**
     * Получить данные собственного профиля по ID.
     *
     * Чтение чужих записей `users` через этот метод невозможно —
     * предварительное условие владения проверяется на клиенте как defense-in-depth,
     * а фактический отказ для чужих ID гарантирует owner-only rule на сервере.
     */
    getUserById: async (
        id: string,
    ): Promise<Result<Profile, UserRepoError>> => {
        const own =
            typeof pb?.authStore?.record?.id === "string"
                ? pb.authStore.record.id
                : null;
        if (!own || own !== id) {
            // Чужой/неизвестный профиль не читается напрямую.
            return err(
                appError(
                    ERROR_CODES.NOT_FOUND_ERROR,
                    `Пользователь ${id} не найден`,
                    new Error("cross-user direct read denied"),
                ),
            );
        }

        return fromPromise<UserRecord, UserRepoError>(
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
     * Совместимый административный список. Прямого чтения users больше нет:
     * сервер возвращает только allowlist DTO и сам проверяет superuser-доступ.
     */
    getAllUsers: async (): Promise<Result<Profile[], UserRepoError>> =>
        userRepository.getAdminUsers(""),

    /**
     * Безопасный поиск по точному username среди публичных профилей.
     * Private/unknown профили намеренно выглядят как отсутствие результата.
     */
    getByUsername: async (
        username: string,
    ): Promise<Result<Profile | null, UserRepoError>> => {
        const result = await userRepository.searchUsers(username);
        if (result.isErr()) {
            return err(result.error);
        }
        return ok(
            result.value.find((profile) => profile.username === username) ??
                null,
        );
    },

    /**
     * Получить публичные E2EE-ключи через серверный capability-эндпоинт
     * POST /api/custom/users/keys. Сервер сам проверяет для каждого
     * target: self, public-профиль или подтверждённую общую существующую комнату.
     * userIds дедуплицируются на сервере; private/unknown без capability
     * пропускаются, а отсутствующие/невалидные ключи дают детерминированный
     * отказ (fallback на прямое чтение `users` запрещён).
     */
    fetchSecurityKeys: async (
        userIds: string[],
        roomId?: string,
    ): Promise<Result<ProfileSecurityKeyDto[], UserRepoError>> => {
        // Дубликаты не отправляем — сервер всё равно дедуплицирует.
        const uniqueIds = [...new Set(userIds)];
        if (uniqueIds.length === 0) {
            return ok([]);
        }
        if (uniqueIds.length > MAX_USER_SECURITY_KEYS_PER_REQUEST) {
            return err(
                appError(
                    ERROR_CODES.VALIDATION_ERROR,
                    "Слишком много пользователей для одного запроса ключей",
                ),
            );
        }

        const transport = await fromPromise<unknown, UserRepoError>(
            pb.send<unknown>(API_ROUTES.USERS_KEYS, {
                method: "POST",
                body: {
                    userIds: uniqueIds,
                    ...(roomId ? { roomId } : {}),
                },
            }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка получения публичных ключей безопасности",
                    e,
                ),
        );
        if (transport.isErr()) {
            return err(transport.error);
        }
        try {
            return ok(parseSecurityKeyResponse(transport.value));
        } catch (e) {
            return err(
                appError(
                    ERROR_CODES.VALIDATION_ERROR,
                    "Некорректный ответ сервера с публичными ключами",
                    e,
                ),
            );
        }
    },

    /**
     * Совместимый контракт для room mutations. Реализация больше не читает
     * users напрямую: все ключи приходят через capability endpoint.
     */
    getProfilesByIds: async (
        userIds: string[],
    ): Promise<
        Result<{ id: string; public_key_x25519: string }[], UserRepoError>
    > => {
        return userRepository.fetchSecurityKeys(userIds).then((result) =>
            result.map((keys) =>
                keys.map(({ id, public_key_x25519 }) => ({
                    id,
                    public_key_x25519,
                })),
            ),
        );
    },

    /**
     * Поиск пользователей
     */
    searchUsers: async (
        query: string,
        _sort: UserSort = `-${USER_FIELDS.CREATED}` as UserSort,
    ): Promise<Result<Profile[], UserRepoError>> => {
        // Если запрос пустой, не отправляем его на сервер, чтобы не грузить всех (как в ТГ)
        if (!query) {
            return ok([]);
        }

        const transport = await fromPromise<unknown, UserRepoError>(
            // Используем кастомный эндпоинт для поиска, так как коллекция users закрыта (listRule)
            pb.send<unknown>(API_ROUTES.USERS_SEARCH, {
                method: "GET",
                query: { q: query },
            }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при поиске пользователей",
                    e,
                ),
        );
        if (transport.isErr()) {
            return err(transport.error);
        }
        try {
            return ok(
                parsePublicProfileSearchResponse(transport.value).map(
                    UserDtoMapper.toPublicProfile,
                ),
            );
        } catch (e) {
            return err(
                appError(
                    ERROR_CODES.VALIDATION_ERROR,
                    "Некорректный ответ поиска пользователей",
                    e,
                ),
            );
        }
    },

    /**
     * Получить список пользователей для панели администрирования.
     * Отправляет запрос на сервер даже при пустой строке поиска.
     */
    getAdminUsers: async (
        search: string,
    ): Promise<Result<Profile[], UserRepoError>> => {
        const transport = await fromPromise<unknown, UserRepoError>(
            pb.send<unknown>(API_ROUTES.USERS_SEARCH, {
                method: "GET",
                query: { q: search },
            }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при получении списка пользователей",
                    e,
                ),
        );
        if (transport.isErr()) {
            return err(transport.error);
        }
        try {
            return ok(
                parseAdminUserResponse(transport.value).map(
                    UserDtoMapper.toAdminProfile,
                ),
            );
        } catch (e) {
            return err(
                appError(
                    ERROR_CODES.VALIDATION_ERROR,
                    "Некорректный ответ списка пользователей",
                    e,
                ),
            );
        }
    },

    /**
     * Получить список контактов (пользователи, с которыми есть чаты)
     */
    getContacts: async (): Promise<Result<Profile[], UserRepoError>> => {
        const transport = await fromPromise<unknown, UserRepoError>(
            pb.send<unknown>(API_ROUTES.USERS_CONTACTS, { method: "GET" }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при получении контактов",
                    e,
                ),
        );
        if (transport.isErr()) {
            return err(transport.error);
        }
        try {
            return ok(
                parseContactProfileResponse(transport.value).map(
                    UserDtoMapper.toContactProfile,
                ),
            );
        } catch (e) {
            return err(
                appError(
                    ERROR_CODES.VALIDATION_ERROR,
                    "Некорректный ответ контактов",
                    e,
                ),
            );
        }
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
        return userRepository.fetchSecurityKeys([userId]).then((result) => {
            if (result.isErr()) {
                return err(result.error);
            }
            const value = result.value.find((entry) => entry.id === userId);
            if (!value) {
                return err(
                    appError(
                        ERROR_CODES.MISSING_KEYS_ERROR,
                        "Публичные ключи пользователя отсутствуют",
                        { userId },
                    ),
                );
            }
            return ok({
                [USER_FIELDS.PUBLIC_KEY_X25519]: value.public_key_x25519,
                [USER_FIELDS.PUBLIC_KEY_SIGNING]: value.public_key_signing,
            });
        });
    },

    /**
     * Читает частичное состояние ключей только собственной записи. Этот узкий
     * owner-only seam нужен для восстановления x25519, если signing key ещё не
     * опубликован; чужие записи сюда не проходят.
     */
    getOwnSecurityKeyState: async (
        userId: string,
    ): Promise<Result<UserSecurityKeys, UserRepoError>> => {
        const own = pb.authStore.record?.id;
        if (typeof own !== "string" || own !== userId) {
            return err(
                appError(
                    ERROR_CODES.FORBIDDEN_ERROR,
                    "Нельзя читать ключи другого пользователя",
                ),
            );
        }

        return fromPromise<unknown, UserRepoError>(
            pb.collection(DB_TABLES.USERS).getOne<unknown>(userId, {
                fields: `${USER_FIELDS.PUBLIC_KEY_X25519},${USER_FIELDS.PUBLIC_KEY_SIGNING}`,
            }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка получения собственного состояния ключей",
                    e,
                ),
        ).then((result) => {
            if (result.isErr()) {
                return err(result.error);
            }
            try {
                return ok(parseOwnSecurityKeyState(result.value));
            } catch (error) {
                return err(
                    appError(
                        ERROR_CODES.VALIDATION_ERROR,
                        "Некорректный ответ собственного состояния ключей",
                        error,
                    ),
                );
            }
        });
    },

    /**
     * Обновить публичные ключи пользователя
     */
    updateSecurityKeys: async ({
        userId,
        x25519,
        signing,
    }: {
        userId: string;
        x25519: string;
        signing: string;
    }): Promise<Result<void, UserRepoError>> => {
        const own = pb.authStore.record?.id;
        if (typeof own !== "string" || own !== userId) {
            return err(
                appError(
                    ERROR_CODES.FORBIDDEN_ERROR,
                    "Нельзя изменять ключи другого пользователя",
                ),
            );
        }

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
    updateProfile: async ({
        userId,
        data,
    }: {
        userId: string;
        data: { username?: string; display_name?: string };
    }): Promise<Result<Profile, UserRepoError>> => {
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
