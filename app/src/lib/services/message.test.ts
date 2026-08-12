import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { ATTACHMENT_TYPES, DB_TABLES, ERROR_CODES } from "@/lib/constants";
import { encryptMessage } from "@/lib/crypto/messages";
import { mediaDb } from "@/lib/mediadb/media-db";
import { pb } from "@/lib/pocketbase";
import { mediaService } from "@/lib/services/media";
import { appError, err, ok } from "@/lib/utils/result";
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

// Мок mediaService/mediaDb: удаление медиа — побочный эффект удаления сообщения.
// В тесте не поднимаем IndexedDB/облако, а проверяем только продуктовый контракт.
vi.mock("@/lib/services/media", () => ({
    mediaService: {
        deleteMedia: vi.fn(),
    },
}));

vi.mock("@/lib/mediadb/media-db", () => ({
    mediaDb: {
        deleteByMessageId: vi.fn(),
    },
}));

// Актуальный контракт удаления (message.ts deleteMessage):
// 1) service всегда сначала вызывает repository.getMessageById (pb getOne);
// 2) своё/admin сообщение -> hardDeleteMessage (pb delete);
// 3) чужое сообщение -> updateMessage с metadata.deleted_by (массив внутри
//    поля metadata), сохраняя остальные metadata;
// 4) NOT_FOUND -> попытка очистки локальных media + success, без update/delete;
// 5) ошибки repository update/delete -> err(DB_ERROR), без ложного success.

interface MockPbConfig {
    getOne?: Record<string, unknown>;
    getOneError?: unknown;
    updateError?: unknown;
    deleteError?: unknown;
}

const mockState = {
    updateCalls: [] as Array<[string, unknown]>,
    deleteCalls: [] as string[],
};

function makeMessage(
    overrides: Record<string, unknown> = {},
): Record<string, unknown> {
    return {
        id: "msg-1",
        room: "room-1",
        sender: "sender-1",
        content: "encrypted",
        iv: "iv",
        type: "text",
        status: "sent",
        metadata: { deleted_by: [] },
        reactions_summary: null,
        attachments: null,
        is_deleted: false,
        is_edited: false,
        is_starred: false,
        created: "2026-08-12T00:00:00.000Z",
        updated: "2026-08-12T00:00:00.000Z",
        ...overrides,
    };
}

function setupMockPb(config: MockPbConfig = {}) {
    mockState.updateCalls.length = 0;
    mockState.deleteCalls.length = 0;

    (pb.collection as Mock).mockImplementation((name: string) => {
        if (name === DB_TABLES.MESSAGES) {
            return {
                getOne: vi.fn(async (_id: string) => {
                    if (config.getOneError !== undefined) {
                        throw config.getOneError;
                    }
                    if (!config.getOne) {
                        throw { status: 404, message: "not found" };
                    }
                    return config.getOne;
                }),
                update: vi.fn(async (id: string, data: unknown) => {
                    if (config.updateError !== undefined) {
                        throw config.updateError;
                    }
                    mockState.updateCalls.push([id, data]);
                    return { id, ...(data as object) };
                }),
                delete: vi.fn(async (id: string) => {
                    if (config.deleteError !== undefined) {
                        throw config.deleteError;
                    }
                    mockState.deleteCalls.push(id);
                    return true;
                }),
            };
        }
        return {};
    });
}

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
        it("своё сообщение: hard delete через pb.delete, Result ok", async () => {
            setupMockPb({ getOne: makeMessage() });

            const result = await MessageService.deleteMessage({
                messageId: "msg-1",
                currentUserId: "my-id",
                isOwnMessage: true,
            });

            expect(result.isOk()).toBe(true);
            expect(mockState.deleteCalls).toEqual(["msg-1"]);
            expect(mockState.updateCalls).toEqual([]);
        });

        it("своё уже глобально удалённое сообщение: идемпотентно, без delete", async () => {
            setupMockPb({ getOne: makeMessage({ is_deleted: true }) });

            const result = await MessageService.deleteMessage({
                messageId: "msg-1",
                currentUserId: "my-id",
                isOwnMessage: true,
            });

            expect(result.isOk()).toBe(true);
            expect(mockState.deleteCalls).toEqual([]);
            expect(mockState.updateCalls).toEqual([]);
        });

        it("чужое сообщение: добавляет currentUserId в metadata.deleted_by, сохраняя остальное", async () => {
            setupMockPb({
                getOne: makeMessage({
                    metadata: {
                        deleted_by: ["other-id"],
                        reply_to_id: "reply-1",
                    },
                }),
            });

            const result = await MessageService.deleteMessage({
                messageId: "msg-1",
                currentUserId: "my-id",
                isOwnMessage: false,
            });

            expect(result.isOk()).toBe(true);
            expect(mockState.updateCalls).toEqual([
                [
                    "msg-1",
                    {
                        metadata: {
                            deleted_by: ["other-id", "my-id"],
                            reply_to_id: "reply-1",
                        },
                    },
                ],
            ]);
            expect(mockState.deleteCalls).toEqual([]);
        });

        it("чужое уже скрытое сообщение: идемпотентно, без повторного update", async () => {
            setupMockPb({
                getOne: makeMessage({
                    metadata: { deleted_by: ["my-id", "other-id"] },
                }),
            });

            const result = await MessageService.deleteMessage({
                messageId: "msg-1",
                currentUserId: "my-id",
                isOwnMessage: false,
            });

            expect(result.isOk()).toBe(true);
            expect(mockState.updateCalls).toEqual([]);
            expect(mockState.deleteCalls).toEqual([]);
        });

        it("NOT_FOUND: очистка локальных media + success, без update/delete", async () => {
            const deleteByMessageId = (
                mediaDb.deleteByMessageId as unknown as Mock
            ).mockResolvedValue(undefined);
            setupMockPb({ getOneError: { status: 404, message: "nf" } });

            const result = await MessageService.deleteMessage({
                messageId: "msg-1",
                currentUserId: "my-id",
                isOwnMessage: false,
            });

            expect(result.isOk()).toBe(true);
            expect(deleteByMessageId).toHaveBeenCalledWith({
                messageId: "msg-1",
                userId: "my-id",
            });
            expect(mockState.updateCalls).toEqual([]);
            expect(mockState.deleteCalls).toEqual([]);
        });

        it("сетевой сбой getOne НЕ маскируется под NOT_FOUND: err(DB_ERROR), без ложного success", async () => {
            setupMockPb({ getOneError: { status: 0, message: "network" } });

            const result = await MessageService.deleteMessage({
                messageId: "msg-1",
                currentUserId: "my-id",
                isOwnMessage: false,
            });

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.DB_ERROR);
            }
            expect(mockState.updateCalls).toEqual([]);
            expect(mockState.deleteCalls).toEqual([]);
        });

        it("ошибка repository update (чужое): err(DB_ERROR), без ложного success", async () => {
            setupMockPb({
                getOne: makeMessage(),
                updateError: new Error("PB update failed"),
            });

            const result = await MessageService.deleteMessage({
                messageId: "msg-1",
                currentUserId: "my-id",
                isOwnMessage: false,
            });

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.DB_ERROR);
            }
        });

        it("ошибка repository delete (своё): err(DB_ERROR), без ложного success", async () => {
            setupMockPb({
                getOne: makeMessage(),
                deleteError: new Error("PB delete failed"),
            });

            const result = await MessageService.deleteMessage({
                messageId: "msg-1",
                currentUserId: "my-id",
                isOwnMessage: true,
            });

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.DB_ERROR);
            }
        });

        it("своё сообщение с вложениями: удаляет медиа по каждому вложению", async () => {
            const deleteMedia = (
                mediaService.deleteMedia as unknown as Mock
            ).mockResolvedValue(ok(undefined));
            setupMockPb({
                getOne: makeMessage({
                    attachments: [
                        {
                            id: "att-1",
                            file_name: "a.jpg",
                            file_size: 10,
                            content_type: "image/jpeg",
                            url: "http://mock/a.jpg",
                            type: ATTACHMENT_TYPES.IMAGE,
                        },
                    ],
                }),
            });

            const result = await MessageService.deleteMessage({
                messageId: "msg-1",
                currentUserId: "my-id",
                isOwnMessage: true,
            });

            expect(result.isOk()).toBe(true);
            expect(deleteMedia).toHaveBeenCalledWith({
                id: "att-1",
                userId: "my-id",
            });
            expect(mockState.deleteCalls).toEqual(["msg-1"]);
        });

        it("сбой очистки медиа из облака НЕ делает удаление неуспешным", async () => {
            (mediaService.deleteMedia as unknown as Mock).mockResolvedValue(
                err(appError(ERROR_CODES.NETWORK_ERROR, "cloud down")),
            );
            setupMockPb({
                getOne: makeMessage({
                    attachments: [
                        {
                            id: "att-1",
                            file_name: "a.jpg",
                            file_size: 10,
                            content_type: "image/jpeg",
                            url: "http://mock/a.jpg",
                            type: ATTACHMENT_TYPES.IMAGE,
                        },
                    ],
                }),
            });

            const result = await MessageService.deleteMessage({
                messageId: "msg-1",
                currentUserId: "my-id",
                isOwnMessage: true,
            });

            expect(result.isOk()).toBe(true);
            expect(mockState.deleteCalls).toEqual(["msg-1"]);
        });
    });
});
