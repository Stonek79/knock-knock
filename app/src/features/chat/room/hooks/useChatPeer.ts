import { useQuery } from "@tanstack/react-query";
import { DB_TABLES, ROOM_TYPE } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { RoomWithMembers } from "@/lib/types/room";

/**
 * Хук для загрузки данных собеседника в DM-чате.
 */
export function useChatPeer(
    otherUserId: string | undefined,
    roomType: RoomWithMembers["type"] | undefined,
) {
    return useQuery({
        queryKey: ["user", otherUserId],
        queryFn: async (): Promise<
            import("@/lib/types/room").PeerUser | null
        > => {
            if (!otherUserId) {
                return null;
            }

            // Mock режим: ищем в MOCK_USERS
            if (import.meta.env.VITE_USE_MOCK === "true") {
                const { MOCK_USERS } = await import("@/lib/mock/data");
                const u = MOCK_USERS.find((u) => u.id === otherUserId);

                if (!u) {
                    return null;
                }

                return {
                    id: u.id,
                    display_name: u.display_name,
                    username: u.username,
                    avatar_url: u.avatar_url,
                };
            }

            // Production: загружаем из Supabase
            const { data, error: profileError } = await supabase
                .from(DB_TABLES.PROFILES)
                .select("id, display_name, username, avatar_url")
                .eq("id", otherUserId)
                .single();

            if (profileError || !data || !data.display_name) {
                return null;
            }
            return {
                id: data.id,
                display_name: data.display_name,
                username: data.username || undefined,
                avatar_url: data.avatar_url || undefined,
            };
        },
        enabled: !!otherUserId && roomType === ROOM_TYPE.DIRECT,
    });
}
