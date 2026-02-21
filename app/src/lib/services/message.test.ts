import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/lib/constants/errors";
import { encryptMessage } from "@/lib/crypto/messages";
import { supabase } from "@/lib/supabase";
import { MessageService } from "./message";

// Моки
vi.mock("@/lib/supabase", () => ({
    supabase: {
        from: vi.fn(),
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

describe("MessageService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("VITE_USE_MOCK", "false");
    });

    describe("sendMessage", () => {
        it("должен вернуть ID сообщения при успешной отправке", async () => {
            // 1. Mock Encrypt
            // @ts-expect-error mock
            encryptMessage.mockResolvedValue({
                ciphertext: "encrypted",
                iv: "iv",
            });

            // 2. Mock Supabase
            const mockSelect = vi.fn().mockReturnValue({
                single: vi
                    .fn()
                    .mockResolvedValue({ data: { id: "msg-1" }, error: null }),
            });
            const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
            // biome-ignore lint/suspicious/noExplicitAny: mock
            (supabase.from as any).mockReturnValue({ insert: mockInsert });

            const result = await MessageService.sendMessage(
                "room-1",
                "user-1",
                "Hello",
                {} as CryptoKey,
            );

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value).toBe("msg-1");
            }
        });

        it("должен вернуть CRYPTO_ERROR при ошибке шифрования", async () => {
            // @ts-expect-error mock
            encryptMessage.mockRejectedValue(new Error("Encrypt Fail"));

            const result = await MessageService.sendMessage(
                "room-1",
                "user-1",
                "Hello",
                {} as CryptoKey,
            );

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.CRYPTO_ERROR);
            }
        });

        it("должен вернуть DB_ERROR при ошибке базы данных", async () => {
            // @ts-expect-error mock
            encryptMessage.mockResolvedValue({
                ciphertext: "encrypted",
                iv: "iv",
            });

            const mockSelect = vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "DB Fail" },
                }),
            });
            const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
            // biome-ignore lint/suspicious/noExplicitAny: mock
            (supabase.from as any).mockReturnValue({ insert: mockInsert });

            const result = await MessageService.sendMessage(
                "room-1",
                "user-1",
                "Hello",
                {} as CryptoKey,
            );

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.DB_ERROR);
            }
        });
    });

    describe("deleteMessage", () => {
        it("должен успешно удалить свое сообщение (Global Delete)", async () => {
            // biome-ignore lint/suspicious/noExplicitAny: mock
            (supabase.from as any).mockReturnValue({
                update: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                })),
            });

            const result = await MessageService.deleteMessage(
                "msg-1",
                "my-id",
                true,
            );
            expect(result.isOk()).toBe(true);
        });

        it("должен успешно удалить чужое сообщение (Local Delete)", async () => {
            // 1. Mock fetch deleted_by
            const mockSingle = vi
                .fn()
                .mockResolvedValue({ data: { deleted_by: [] }, error: null });
            const mockSelect = vi.fn(() => ({
                eq: vi.fn(() => ({ single: mockSingle })),
            }));

            // 2. Mock update
            const mockUpdate = vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
            }));

            // Chain mock
            // biome-ignore lint/suspicious/noExplicitAny: mock
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === "messages") {
                    return {
                        select: mockSelect,
                        update: mockUpdate,
                    };
                }
                return {};
            });

            const result = await MessageService.deleteMessage(
                "msg-1",
                "my-id",
                false,
            );
            expect(result.isOk()).toBe(true);
        });
    });
});
