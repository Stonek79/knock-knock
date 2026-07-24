import { API_ROUTES } from "../constants";
import { pb } from "../pocketbase";

export const callRepository = {
    /**
     * Запрашивает токен для участия в конференции
     * @param roomId Идентификатор комнаты
     * @returns Токен для LiveKit
     */
    async getToken(roomId: string): Promise<{ token: string }> {
        return await pb.send<{ token: string }>(API_ROUTES.CALLS_TOKEN, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: roomId }),
        });
    },
};
