import { chatCryptoService } from "@/lib/services/chat-crypto";
import type { RoomWithMembers } from "@/lib/types";

export async function decryptRoomPreviews(
    rooms: RoomWithMembers[],
    userId: string,
): Promise<RoomWithMembers[]> {
    return Promise.all(
        rooms.map(async (room) => {
            const last = room.last_message;
            // Ничего расшифровывать не нужно: нет превью / удалено / пустой текст
            if (!last || last.is_deleted || !last.content) {
                return room;
            }
            try {
                const result = await chatCryptoService.decryptPreview({
                    message: {
                        room: room.id,
                        content: last.content,
                        iv: last.iv || "",
                        is_deleted: !!last.is_deleted,
                        attachments: last.attachments ?? null,
                    },
                    userId,
                });
                // Контракт сервиса возвращает { isDecrypted }. При любой неудаче
                // (reject ИЛИ isDecrypted: false) НЕ выводим ciphertext: заменяем
                // content безопасным пустым значением.
                if (!result.isDecrypted) {
                    return {
                        ...room,
                        last_message: { ...last, content: "" },
                    };
                }
                // Не мутируем вход: возвращаем копию с расшифрованным content.
                return {
                    ...room,
                    last_message: { ...last, content: result.content },
                };
            } catch {
                // Один сбойный кеш не должен валить весь список. Вместо
                // ciphertext показываем безопасный пустой превью.
                return {
                    ...room,
                    last_message: { ...last, content: "" },
                };
            }
        }),
    );
}
