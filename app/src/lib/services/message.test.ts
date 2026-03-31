import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/lib/constants/errors";
import { encryptMessage } from "@/lib/crypto/messages";
import { pb } from "@/lib/pocketbase";
import { MessageService } from "./message";

// Моки PocketBase
vi.mock("@/lib/pocketbase", () => ({
    pb: {
        collection: vi.fn(),
    },
}));

vi.mock("@/lib/crypto/messages", () => ({
    encryptMessage: vi.fn(),
}));

// Мок логгера
vi.mock("@/lib/logger", () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
    },
}));

describe("MessageService (PocketBase)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("VITE_USE_MOCK", "false");
    });

    describe("sendMessage", () => {
        it("должен вернуть ID сообщения при успешной отправке", async () => {
            // 1. Mock Encrypt
            (
                encryptMessage as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue({
                ciphertext: "encrypted",
                iv: "iv",
            });

            // 2. Mock PocketBase
            const mockCreate = vi.fn().mockResolvedValue({ id: "msg-1" });
            (
                pb.collection as unknown as ReturnType<typeof vi.fn>
            ).mockReturnValue({
                create: mockCreate,
            });

            const result = await MessageService.sendMessage({
                roomId: "room-1",
                senderId: "user-1",
                content: "Hello",
                roomKey: {} as CryptoKey,
            });

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value).toBe("msg-1");
            }
            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    room: "room-1",
                    sender: "user-1",
                    content: "encrypted",
                }),
            );
        });

        it("должен вернуть DB_ERROR при ошибке PocketBase", async () => {
            (
                encryptMessage as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue({
                ciphertext: "encrypted",
                iv: "iv",
            });

            (
                pb.collection as unknown as ReturnType<typeof vi.fn>
            ).mockReturnValue({
                create: vi.fn().mockRejectedValue(new Error("PB Error")),
            });

            const result = await MessageService.sendMessage({
                roomId: "room-1",
                senderId: "user-1",
                content: "Hello",
                roomKey: {} as CryptoKey,
            });

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.DB_ERROR);
            }
        });
    });

    describe("deleteMessage", () => {
        it("должен успешно удалить свое сообщение (Global Delete)", async () => {
            const mockUpdate = vi.fn().mockResolvedValue({ id: "msg-1" });
            (
                pb.collection as unknown as ReturnType<typeof vi.fn>
            ).mockReturnValue({
                update: mockUpdate,
            });

            const result = await MessageService.deleteMessage({
                messageId: "msg-1",
                currentUserId: "my-id",
                isOwnMessage: true,
            });

            expect(result.isOk()).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith("msg-1", {
                content: "",
                iv: "",
                is_edited: false,
                is_deleted: true,
            });
        });

        it("должен успешно удалить чужое сообщение (Local Delete)", async () => {
            // 1. Mock getOne (fetch deleted_by)
            const mockGetOne = vi
                .fn()
                .mockResolvedValue({ id: "msg-1", deleted_by: [] });
            const mockUpdate = vi.fn().mockResolvedValue({ id: "msg-1" });

            (
                pb.collection as unknown as ReturnType<typeof vi.fn>
            ).mockImplementation((coll: string) => {
                if (coll === "messages") {
                    return {
                        getOne: mockGetOne,
                        update: mockUpdate,
                    };
                }
                return {};
            });

            const result = await MessageService.deleteMessage({
                messageId: "msg-1",
                currentUserId: "my-id",
                isOwnMessage: false,
            });

            expect(result.isOk()).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith("msg-1", {
                "deleted_by+": "my-id",
            });
        });
    });
});
