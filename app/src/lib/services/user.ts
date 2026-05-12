import { userRepository } from "../repositories/user.repository";
import type { Profile, Result, UserRepoError } from "../types";

export const userService = {
    /**
     * Получение профиля пользователя по ID
     */
    getUserProfile: async (
        userId: string,
    ): Promise<Result<Profile, UserRepoError>> => {
        return userRepository.getUserById(userId);
    },

    /**
     * Обновление профиля пользователя
     */
    updateProfile: async (
        userId: string,
        data: { username?: string; display_name?: string },
    ): Promise<Result<Profile, UserRepoError>> => {
        return userRepository.updateProfile({ userId, data });
    },
};
