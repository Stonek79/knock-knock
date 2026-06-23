import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { userRepository } from "@/lib/repositories/user.repository";

export function useUserSearch(query: string) {
    return useQuery({
        queryKey: QUERY_KEYS.adminUsers(query),
        queryFn: async () => {
            const result = await userRepository.searchUsers(query);
            if (result.isErr()) {
                logger.error("Ошибка поиска пользователей", result.error);
                throw result.error;
            }
            return result.value;
        },
        enabled: query.length > 0,
        staleTime: 1000 * 60,
    });
}
