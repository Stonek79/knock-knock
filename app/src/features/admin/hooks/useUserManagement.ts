import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { QUERY_KEYS } from "@/lib/constants";
import { userRepository } from "@/lib/repositories/user.repository";
import type { Profile } from "@/lib/types";

/**
 * Хук для управления пользователями (Админ-панель).
 * Позволяет искать, банить и разбанивать пользователей.
 * Работает через userRepository.
 */
export function useUserManagement() {
    const [search, setSearch] = useState("");

    const {
        data: users = [],
        isLoading,
        refetch,
        error,
    } = useQuery<Profile[]>({
        queryKey: QUERY_KEYS.adminUsers(search),
        queryFn: async () => {
            const result = await userRepository.searchUsers(search);

            if (result.isErr()) {
                throw result.error;
            }

            return result.value;
        },
    });

    /**
     * Мутация для бана пользователя
     */
    const banMutation = useMutation({
        mutationFn: ({
            userId,
            durationDays,
        }: {
            userId: string;
            durationDays: number;
        }) => userRepository.banUser(userId, durationDays),
        onSuccess: () => refetch(),
    });

    /**
     * Мутация для разбана пользователя
     */
    const unbanMutation = useMutation({
        mutationFn: (userId: string) => userRepository.unbanUser(userId),
        onSuccess: () => refetch(),
    });

    return {
        users,
        isLoading,
        error,
        search,
        setSearch,
        banUser: async (userId: string, durationDays = 7) => {
            const result = await banMutation.mutateAsync({
                userId,
                durationDays,
            });
            if (result.isErr()) {
                throw result.error;
            }
        },
        unbanUser: async (userId: string) => {
            const result = await unbanMutation.mutateAsync(userId);
            if (result.isErr()) {
                throw result.error;
            }
        },
        refetch,
    };
}
