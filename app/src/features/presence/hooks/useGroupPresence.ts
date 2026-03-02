import { useMemo } from "react";
import { USER_WEB_STATUS } from "@/lib/constants";
import { usePresence } from "./usePresence";

/**
 * Хук для отслеживания онлайн-статуса группы пользователей.
 * Использует базовый хук usePresence и фильтрует только переданные ID.
 */
export function useGroupPresence(userIds: string[]) {
    const onlineUsers = usePresence();

    const groupPresence = useMemo(() => {
        let onlineCount = 0;
        const onlineStatusMap: Record<string, boolean> = {};

        userIds.forEach((id) => {
            const isOnline = onlineUsers[id] === USER_WEB_STATUS.ONLINE;
            onlineStatusMap[id] = isOnline;
            if (isOnline) {
                onlineCount++;
            }
        });

        return {
            onlineCount,
            totalCount: userIds.length,
            onlineStatusMap,
        };
    }, [onlineUsers, userIds]);

    return groupPresence;
}
