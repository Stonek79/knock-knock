import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { DB_TABLES, ERROR_CODES } from "@/lib/constants";
import { pb } from "@/lib/pocketbase";
import { createRoom, findOrCreateDM } from "./room";

// Моки PocketBase
vi.mock("@/lib/pocketbase", () => ({
    pb: {
        collection: vi.fn(),
    },
}));

vi.mock("@/lib/crypto/rooms", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        generateRoomKey: vi.fn().mockResolvedValue("mock-room-key"),
        generateRoomId: vi.fn().mockReturnValue("new-room-id"),
    };
});

vi.mock("@/lib/crypto/encryption", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        wrapRoomKey: vi.fn().mockResolvedValue({
            ephemeralPublicKey: new ArrayBuffer(0),
            iv: new ArrayBuffer(0),
            ciphertext: new ArrayBuffer(0),
        }),
    };
});

describe("RoomService (PocketBase)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("VITE_USE_MOCK", "false");

        if (!window.crypto) {
            // biome-ignore lint/suspicious/noExplicitAny: mock
            (window as any).crypto = { subtle: {} };
        }
        window.crypto.subtle.importKey = vi
            .fn()
            .mockResolvedValue({} as CryptoKey);
    });

    describe("createRoom", () => {
        it("должен вернуть MISSING_KEYS если у пользователя нет ключей", async () => {
            // Мок получения профилей (getFullList)
            const mockGetFullList = vi.fn().mockResolvedValue([
                { id: "my-id", public_key_x25519: "key" },
                // peer-id отсутствует
            ]);
            (pb.collection as Mock).mockReturnValue({
                getFullList: mockGetFullList,
            });

            const result = await createRoom({
                name: "Test Room",
                type: "group",
                myUserId: "my-id",
                peerIds: ["peer-id"],
            });

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.MISSING_KEYS);
                expect(result.error.details).toEqual({ userIds: ["peer-id"] });
            }
        });

        it("должен вернуть DB_ERROR при ошибке создания", async () => {
            (pb.collection as Mock).mockReturnValue({
                create: vi.fn().mockRejectedValue(new Error("PB Error")),
            });
            const result = await createRoom({
                name: "Test Room",
                type: "group",
                myUserId: "my-id",
                peerIds: ["peer-id"],
            });

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.DB_ERROR);
            }
        });

        it("должен успешно создать комнату со всеми связями", async () => {
            const validBase64Key = btoa("mock1234mock1234mock1234mock1234");

            // 1. Мок профилей
            const mockGetFullList = vi.fn().mockResolvedValue([
                { id: "my-id", public_key_x25519: validBase64Key },
                { id: "peer-id", public_key_x25519: validBase64Key },
            ]);

            // 2. Моки создания (create)
            const mockCreateRoom = vi
                .fn()
                .mockResolvedValue({ id: "new-room-id" });
            const mockCreateMember = vi.fn().mockResolvedValue({});
            const mockCreateKey = vi.fn().mockResolvedValue({});

            (pb.collection as Mock).mockImplementation((coll: string) => {
                if (coll === DB_TABLES.USERS) {
                    return { getFullList: mockGetFullList };
                }
                if (coll === DB_TABLES.ROOMS) {
                    return { create: mockCreateRoom };
                }
                if (coll === DB_TABLES.ROOM_MEMBERS) {
                    return { create: mockCreateMember };
                }
                if (coll === DB_TABLES.ROOM_KEYS) {
                    return { create: mockCreateKey };
                }
                return {};
            });

            const result = await createRoom({
                name: "Test Room",
                type: "group",
                myUserId: "my-id",
                peerIds: ["peer-id"],
            });

            expect(result.isOk()).toBe(true);
            expect(mockCreateRoom).toHaveBeenCalled();
            expect(mockCreateMember).toHaveBeenCalledTimes(2); // Я + Собеседник
            expect(mockCreateKey).toHaveBeenCalledTimes(2);
        });
    });

    describe("findOrCreateDM", () => {
        it("должен вернуть ID существующей комнаты, если она найдена", async () => {
            // Мок поиска (getFullList) через room_members
            const mockGetFullList = vi.fn().mockResolvedValue([
                {
                    room: "existing-room",
                    expand: {
                        room: {
                            type: "direct",
                            room_members_via_room: [
                                { user: "my-id" },
                                { user: "target-id" },
                            ],
                        },
                    },
                },
            ]);
            // biome-ignore lint/suspicious/noExplicitAny: mock
            (pb.collection as any).mockReturnValue({
                getFullList: mockGetFullList,
            });

            const result = await findOrCreateDM("my-id", "target-id");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value).toBe("existing-room");
            }
        });
    });
});
