import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ERROR_CODES, QUERY_KEYS } from "@/lib/constants";
import { getChatRoomData } from "@/lib/services/room";
import type { RoomDataWithKey } from "@/lib/types";
import { appError } from "@/lib/utils/result";
import { useAuthStore } from "@/stores/auth";

/**
 * Хук для загрузки данных комнаты и ключей шифрования.
 * Инкапсулирует логику получения метаданных и E2E ключей через сервис.
 */
export function useChatRoomData(propRoomId?: string) {
    const params = useParams({ strict: false }) as Record<
        string,
        string | undefined
    >;
    const roomId = propRoomId ?? params?.roomId;
    const pbUser = useAuthStore((state) => state.pbUser);

    return useQuery({
        queryKey: QUERY_KEYS.room(roomId ?? ""),
        queryFn: async (): Promise<RoomDataWithKey> => {
            if (!roomId || !pbUser) {
                throw appError(
                    ERROR_CODES.VALIDATION_ERROR,
                    "Параметры комнаты отсутствуют",
                );
            }

            const result = await getChatRoomData(roomId, pbUser.id);

            if (result.isErr()) {
                throw result.error;
            }

            return result.value;
        },
        enabled: !!pbUser && !!roomId,
        staleTime: 1000 * 60 * 60, // Данные комнаты и ключи статичны, кэшируем на 1 час
    });
}
