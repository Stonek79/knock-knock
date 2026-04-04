import { logger } from "../logger";
import { authRepository } from "../repositories/auth.repository";
import type {
    AuthRepoError,
    UserRecord as AuthUser,
    Result,
    UsersResponse,
} from "../types";

/**
 * Сервис авторизации.
 * Оркестрирует процессы входа, регистрации и управления сессией,
 * используя authRepository для доступа к данным.
 */
export const AuthService = {
    /**
     * Регистрация нового пользователя
     */
    register: async (
        email: string,
        password: string,
    ): Promise<Result<AuthUser, AuthRepoError>> => {
        const result = await authRepository.register(email, password);

        if (result.isOk()) {
            logger.info(
                "Пользователь зарегистрирован, ожидаем инициализацию системных комнат...",
            );
            // Серверный хук pb_hooks создаст комнату Избранное автоматически.
            // Нам не нужно ничего делать на фронте, кроме как вернуть успех.
        }

        return result;
    },

    /**
     * Логин с помощью email и пароля
     */
    loginWithPassword: async (
        email: string,
        password: string,
    ): Promise<Result<AuthUser, AuthRepoError>> => {
        return authRepository.login(email, password);
    },

    /**
     * Обновление текущего токена
     */
    refreshSession: async (): Promise<Result<AuthUser, AuthRepoError>> => {
        return authRepository.refreshSession();
    },

    /**
     * Очистка текущей сессии
     */
    logout: () => {
        authRepository.logout();
    },

    /**
     * Проверка валидности текущей сессии локально без запроса
     */
    isValid: (): boolean => {
        return authRepository.isAuthenticated();
    },

    /**
     * Получение текущего рекорда из локального хранилища
     */
    getLocalRecord: (): AuthUser | null => {
        return authRepository.getCurrentUser();
    },

    /**
     * Обновление данных текущего пользователя
     */
    updateMe: async (
        data: Partial<UsersResponse>,
    ): Promise<Result<AuthUser, AuthRepoError>> => {
        return authRepository.updateMe(data);
    },

    /**
     * Запрос письма верификации email
     */
    requestVerification: async (
        email: string,
    ): Promise<Result<void, AuthRepoError>> => {
        return authRepository.requestVerification(email);
    },

    /**
     * Подтверждение email по токену
     */
    confirmVerification: async (
        token: string,
    ): Promise<Result<void, AuthRepoError>> => {
        return authRepository.confirmVerification(token);
    },

    /**
     * Подписка на изменения авторизации
     */
    onChange: (callback: (token: string, model: unknown) => void) => {
        return authRepository.onChange(callback);
    },
};
