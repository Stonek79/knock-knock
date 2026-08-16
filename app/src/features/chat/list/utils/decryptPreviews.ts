import { chatCryptoService } from "@/lib/services/chat-crypto";
import type { RoomWithMembers } from "@/lib/types";

/**
 * Расшифровывает превью последних сообщений для списка чатов.
 *
 * Не мутирует входные комнаты: возвращает копии, в которых last_message.content
 * заменён расшифрованным plaintext. Исходный массив (raw ciphertext) остаётся
 * нетронутым и именно он может безопасно попадать в постоянный кеш — plaintext
 * живёт только в памяти результата query и в TanStack Query cache.
 */
export async function decryptRoomPreviews(
    rooms: RoomWithMembers[],
    userId: string,
): Promise<RoomWithMembers[]> {
    return Promise.all(
        rooms.map(async (room) => {
            if (
                room.last_message &&
                !room.last_message.is_deleted &&
                room.last_message.content
            ) {
                const { content } = await chatCryptoService.decryptPreview({
                    message: {
                        ...room.last_message,
                        room: room.id,
                        content: room.last_message.content,
                        iv: room.last_message.iv || "",
                        is_deleted: !!room.last_message.is_deleted,
                    },
                    userId,
                });
                return {
                    ...room,
                    last_message: { ...room.last_message, content },
                };
            }
            return room;
        }),
    );
}
