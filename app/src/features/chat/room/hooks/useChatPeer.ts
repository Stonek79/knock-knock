import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS, ROOM_TYPE } from "@/lib/constants";
import { userService } from "@/lib/services/user";
import type { Profile, RoomsTypeOptions } from "@/lib/types";

/**
 * Хук для загрузки данных собеседника в DM-чате через сервис.
 */
export function useChatPeer(
    otherUserId: string | undefined,
    roomType: RoomsTypeOptions | undefined,
) {
    return useQuery({
        queryKey: QUERY_KEYS.user(otherUserId ?? ""),
        queryFn: async (): Promise<Profile | null> => {
            if (!otherUserId) {
                return null;
            }

            const result = await userService.getUserProfile(otherUserId);

            if (result.isErr()) {
                return null;
            }

            return result.value;
        },
        enabled: !!otherUserId && roomType === ROOM_TYPE.DIRECT,
    });
}
