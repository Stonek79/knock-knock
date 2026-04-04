import { DB_TABLES, ERROR_CODES } from "../constants";
import { pb } from "../pocketbase";
import type {
    AuthRepoError,
    UserRecord as AuthUser,
    PBRecord,
    Result,
    UsersResponse,
} from "../types";
import { mapPbErrorCode } from "../utils/errors";
import { appError, err, fromPromise } from "../utils/result";

/**
 * Type Guard для проверки записи пользователя.
 */
function isUserRecord(record: unknown): record is AuthUser {
    return (
        typeof record === "object" &&
        record !== null &&
        "id" in record &&
        "email" in record
    );
}

/**
 * FUNCTIONAL AUTH REPOSITORY
 * Управляет авторизацией и состоянием текущего сеанса.
 */
export const authRepository = {
    /**
     * Регистрация нового пользователя
     */
    register: async (
        email: string,
        password: string,
    ): Promise<Result<AuthUser, AuthRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.USERS).create<AuthUser>({
                email,
                password,
                passwordConfirm: password,
            }),
            (e) => {
                return appError(mapPbErrorCode(e), "Ошибка регистрации", e);
            },
        );
    },

    /**
     * Логин с помощью email и пароля
     */
    login: async (
        email: string,
        password: string,
    ): Promise<Result<AuthUser, AuthRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.USERS)
                .authWithPassword<AuthUser>(email, password)
                .then((res) => res.record),
            (e) => {
                return appError(
                    mapPbErrorCode(e),
                    "Неверный логин или пароль",
                    e,
                );
            },
        );
    },

    /**
     * Обновление текущей сессии (refresh token)
     */
    refreshSession: async (): Promise<Result<AuthUser, AuthRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.USERS)
                .authRefresh<AuthUser>()
                .then((res) => res.record),
            (e) => {
                return appError(mapPbErrorCode(e), "Сессия истекла", e);
            },
        );
    },

    /**
     * Возвращает текущего авторизованного пользователя из AuthStore
     */
    getCurrentUser: (): AuthUser | null => {
        const record = pb.authStore.record;

        if (!record || !isUserRecord(record)) {
            return null;
        }

        return record;
    },

    /**
     * Проверка: авторизован ли пользователь
     */
    isAuthenticated: (): boolean => {
        return pb.authStore.isValid;
    },

    /**
     * Выход из системы
     */
    logout: (): void => {
        pb.authStore.clear();
    },

    /**
     * Обновление данных (профиля) текущего пользователя
     */
    updateMe: async (
        data: Partial<UsersResponse>,
    ): Promise<Result<AuthUser, AuthRepoError>> => {
        const currentUserId = pb.authStore.record?.id;

        if (!currentUserId) {
            return err(
                appError(
                    ERROR_CODES.AUTHENTICATION_ERROR,
                    "Пользователь не авторизован",
                ),
            );
        }

        return fromPromise(
            pb
                .collection(DB_TABLES.USERS)
                .update<AuthUser>(currentUserId, data),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при обновлении профиля",
                    e,
                );
            },
        );
    },

    /**
     * Запрос письма верификации email
     */
    requestVerification: async (
        email: string,
    ): Promise<Result<void, AuthRepoError>> => {
        return fromPromise(
            // Добавляем .then(() => {}), чтобы сбросить результат boolean в void
            pb
                .collection(DB_TABLES.USERS)
                .requestVerification(email)
                .then(() => {}),
            (e) => {
                return appError(
                    mapPbErrorCode(e),
                    "Ошибка отправки подтверждения",
                    e,
                );
            },
        );
    },

    /**
     * Подтверждение email по токену
     */
    confirmVerification: async (
        token: string,
    ): Promise<Result<void, AuthRepoError>> => {
        return fromPromise(
            // Аналогично здесь
            pb
                .collection(DB_TABLES.USERS)
                .confirmVerification(token)
                .then(() => {}),
            (e) => {
                return appError(
                    mapPbErrorCode(e),
                    "Ошибка подтверждения email",
                    e,
                );
            },
        );
    },

    /**
     * Смена пароля текущего пользователя
     */
    changePassword: async (
        oldPassword: string,
        password: string,
        passwordConfirm: string,
    ): Promise<Result<AuthUser, AuthRepoError>> => {
        const currentUserId = pb.authStore.record?.id;
        if (!currentUserId) {
            return err(
                appError(
                    ERROR_CODES.AUTHENTICATION_ERROR,
                    "Пользователь не авторизован",
                ),
            );
        }

        return fromPromise(
            pb.collection(DB_TABLES.USERS).update<AuthUser>(currentUserId, {
                oldPassword,
                password,
                passwordConfirm,
            }),
            (e) => appError(mapPbErrorCode(e), "Ошибка при смене пароля", e),
        );
    },

    /**
     * Удаление аккаунта с подтверждением пароля
     */
    deleteAccount: async (
        password: string,
    ): Promise<Result<void, AuthRepoError>> => {
        const record = pb.authStore.record;
        if (!record?.id || !record?.email) {
            return err(
                appError(
                    ERROR_CODES.AUTHENTICATION_ERROR,
                    "Пользователь не авторизован",
                ),
            );
        }

        // 1. Проверяем пароль через повторную авторизацию
        const authResult = await fromPromise(
            pb
                .collection(DB_TABLES.USERS)
                .authWithPassword(record.email, password),
            (e) =>
                appError(
                    ERROR_CODES.AUTHENTICATION_ERROR,
                    "Неверный пароль",
                    e,
                ),
        );

        if (authResult.isErr()) {
            return err(authResult.error);
        }

        // 2. Если пароль ок — удаляем запись
        return fromPromise(
            pb
                .collection(DB_TABLES.USERS)
                .delete(record.id)
                .then(() => {}),
            (e) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при удалении аккаунта",
                    e,
                ),
        );
    },

    /**
     * Подписка на изменения состояния авторизации
     */
    onChange: (callback: (token: string, model: unknown) => void) => {
        return pb.authStore.onChange(callback);
    },

    /**
     * Получение URL файла для записи пользователя
     */
    getFileUrl: (record: PBRecord, filename: string): string => {
        return pb.files.getURL(record, filename);
    },
};
