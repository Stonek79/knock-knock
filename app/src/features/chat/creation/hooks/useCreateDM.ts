import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import { RoomService } from "@/lib/services/room";

interface CreateDMParams {
    currentUserId: string;
    targetUserId: string;
    isPrivate?: boolean;
}

/**
 * Хук для создания прямого чата (DM).
 * Инвалидирует список комнат при успехе.
 */
export function useCreateDM() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            currentUserId,
            targetUserId,
            isPrivate,
        }: CreateDMParams) => {
            const res = await RoomService.findOrCreateDM(
                currentUserId,
                targetUserId,
                isPrivate,
            );
            if (res.isErr()) {
                throw new Error(res.error.message);
            }
            return res.value;
        },
        onSuccess: async () => {
            // Инвалидируем кэш списка комнат
            await queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.rooms(),
            });
        },
    });
}
