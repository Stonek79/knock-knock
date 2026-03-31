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
        if (!record) {
            return null;
        }
        // Приводим к типу AuthUser, так как мы синхронизировали схему
        return record as unknown as AuthUser;
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
