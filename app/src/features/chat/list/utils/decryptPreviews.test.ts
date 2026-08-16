import { describe, expect, it, vi } from "vitest";
import type { RoomWithMembers } from "@/lib/types";
import { decryptRoomPreviews } from "./decryptPreviews";

/**
 * Юнит-тесты расшифровки превью последнего сообщения в списке чатов.
 * Не подключаются к PocketBase / реальной криптографии (chatCryptoService замокан).
 * Продуктовый контракт:
 *  - успешная расшифровка подставляет plaintext в last_message.content;
 *  - ошибка расшифровки НЕ выводит ciphertext пользователю: content заменяется
 *    безопасным пустым значением, а не строкой шифротекста с сервера.
 */

const decryptMocks = vi.hoisted(() => ({
    decryptPreview: vi.fn(),
}));
vi.mock("@/lib/services/chat-crypto", () => ({
    chatCryptoService: {
        decryptPreview: (...args: unknown[]) =>
            decryptMocks.decryptPreview(...args),
    },
}));

function makeRoom(id: string, content: string): RoomWithMembers {
    return {
        id,
        name: null,
        type: "direct",
        visibility: "private",
        avatar_url: null,
        created_by: "creator",
        created_at: "2026-01-01T00:00:00.000Z",
        updated: "2026-01-01T00:00:00.000Z",
        room_members: [],
        metadata: {},
        permissions: {},
        last_message: {
            id: `msg-${id}`,
            content,
            created: "2026-01-01T00:00:00.000Z",
            is_deleted: false,
            iv: "iv-placeholder",
        },
    };
}

describe("decryptRoomPreviews", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("подставляет расшифрованный plaintext в last_message.content", async () => {
        decryptMocks.decryptPreview.mockResolvedValue({
            content: "Расшифрованный текст",
            isDecrypted: true,
        });

        const result = await decryptRoomPreviews(
            [makeRoom("r1", "CIPHERTEXT")],
            "user-a",
        );

        expect(result[0]?.last_message?.content).toBe("Расшифрованный текст");
    });

    it("при ошибке расшифровки не выводит ciphertext пользователю", async () => {
        // Симулируем недоступный/неверный ключ → decryptPreview бросает
        decryptMocks.decryptPreview.mockRejectedValue(
            new Error("decrypt failed"),
        );

        const result = await decryptRoomPreviews(
            [makeRoom("r1", "CIPHERTEXT-SHOULD-NOT-LEAK")],
            "user-a",
        );

        expect(result).toHaveLength(1);
        const preview = result[0]?.last_message;
        expect(preview).not.toBeNull();
        // Безопасная замена: пустой контент, а не зашифрованная строка.
        expect(preview?.content).toBe("");
        expect(preview?.content).not.toContain("CIPHERTEXT");
    });

    it("при result { isDecrypted: false } не выводит ciphertext пользователю", async () => {
        // Сервис может «успешно» вернуть результат, но пометить, что сообщение
        // НЕ расшифровано (например, неверный/недоступный ключ). В этом случае
        // ciphertext из result.content тоже не должен попасть в UI.
        decryptMocks.decryptPreview.mockResolvedValue({
            content: "CIPHERTEXT-FROM-ISDECRYPTED-FALSE",
            isDecrypted: false,
        });

        const result = await decryptRoomPreviews(
            [makeRoom("r1", "CIPHERTEXT")],
            "user-a",
        );

        const preview = result[0]?.last_message;
        expect(preview).not.toBeNull();
        expect(preview?.content).toBe("");
        expect(preview?.content).not.toContain("CIPHERTEXT");
    });

    it("не расшифровывает удалённые или пустые превью (оставляет как есть)", async () => {
        const room = makeRoom("r1", "");
        room.last_message = null;

        const result = await decryptRoomPreviews([room], "user-a");

        expect(result[0]?.last_message).toBeNull();
        expect(decryptMocks.decryptPreview).not.toHaveBeenCalled();
    });
});
