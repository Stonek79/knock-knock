import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RoomService } from "@/lib/services/room";

interface CreateDMParams {
    currentUserId: string;
    targetUserId: string;
    isPrivate?: boolean;
}

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
        onSuccess: () => {
            // Инвалидируем список комнат, чтобы новый чат появился в сайдбаре
            queryClient.invalidateQueries({
                queryKey: ["rooms"],
                refetchType: "all",
            });
        },
    });
}
