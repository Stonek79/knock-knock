import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { userRepository } from "@/lib/repositories/user.repository";

/**
 * Хук для получения списка контактов.
 * Использует централизованный userRepository и QUERY_KEYS.
 */
export function useContacts() {
    return useQuery({
        queryKey: QUERY_KEYS.contacts(),
        queryFn: async () => {
            const result = await userRepository.getAllUsers();

            if (result.isErr()) {
                logger.error(
                    "useContacts: Ошибка загрузки контактов",
                    result.error,
                );
                throw result.error;
            }

            return result.value;
        },
        staleTime: 1000 * 60 * 5, // 5 минут
    });
}
