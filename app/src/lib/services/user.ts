import { userRepository } from "../repositories/user.repository";
import type { Profile, Result, UserRepoError } from "../types";
import { err, ok } from "../utils/result";

export const userService = {
    /**
     * Получение профиля пользователя по ID
     */
    getUserProfile: async (
        userId: string,
    ): Promise<Result<Profile, UserRepoError>> => {
        return userRepository.getUserById(userId);
    },

    /** Получение собеседника только через membership-scoped contacts DTO. */
    getPeerProfile: async (
        userId: string,
    ): Promise<Result<Profile | null, UserRepoError>> => {
        const result = await userRepository.getContacts();
        if (result.isErr()) {
            return err(result.error);
        }
        return ok(
            result.value.find((profile) => profile.id === userId) ?? null,
        );
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
