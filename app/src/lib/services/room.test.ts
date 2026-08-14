import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import {
    API_ROUTES,
    DB_TABLES,
    ERROR_CODES,
    MEMBER_ROLE,
    ROOM_VISIBILITY,
} from "@/lib/constants";
import { pb } from "@/lib/pocketbase";
import { addMembersToGroup, createRoom, findOrCreateDM } from "./room";

// Локальный тестовый адаптер PocketBase для scope room.test.ts.
// Отражает реальные API PocketBase: collection().getOne/getFullList/getFirstListItem/create,
// pb.filter(), pb.createBatch()+batch.collection().create()+batch.send(), pb.files.getURL().
// Не меняет production PocketBase API. Не использует реальные ключи или plaintext.

type MockRecord = { id: string; [key: string]: unknown };

interface MockPbConfig {
    users?: MockRecord[];
    rooms?: MockRecord[];
    roomMembers?: MockRecord[];
    roomKeys?: MockRecord[];
    // Заставить getOne выбросить ошибку, отличную от 404 (сеть и т.п.),
    // чтобы проверить ветвь распространения ошибки в getProfilesByIds.
    getOneThrow?: { collection: string; id: string; error: unknown };
    // Заставить batch.send() отвергнуть промис — эмулирует сбой создания комнаты.
    batchSendError?: unknown;
    // Фиксированное значение getFirstListItem (для findOrCreateDM «найдено»).
    firstListItem?: MockRecord;
}

// Глобальное состояние мока, инспектируемое из тестов. Сбрасывается в setupMockPb.
const mockState = {
    batchOps: [] as Array<{ collection: string; data: unknown }>,
    createBatchCalls: 0,
    sendCalls: 0,
};

// Хойстинг крипто-моков, чтобы обращаться к ним и в vi.mock, и в тестах.
// generateRoomKey возвращает плейсхолдер (не настоящий ключ); generateRoomId —
// детерминированный id; wrapRoomKey — пустые ArrayBuffer (без plaintext).
const MOCK_ROOM_KEY = {
    [Symbol.for("nemo.test.roomKey")]: true,
} as unknown as CryptoKey;
const EMPTY_BUF = (): ArrayBuffer => new ArrayBuffer(0);

const cryptoMocks = vi.hoisted(() => ({
    generateRoomKey: vi.fn(),
    generateRoomId: vi.fn(),
    wrapRoomKey: vi.fn(),
}));

vi.mock("@/lib/pocketbase", () => ({
    pb: {
        send: vi.fn(),
        collection: vi.fn(),
        filter: vi.fn(),
        createBatch: vi.fn(),
        files: { getURL: vi.fn() },
    },
}));

vi.mock("@/lib/crypto/rooms", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        generateRoomKey: cryptoMocks.generateRoomKey,
        generateRoomId: cryptoMocks.generateRoomId,
    };
});

vi.mock("@/lib/crypto/encryption", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        wrapRoomKey: cryptoMocks.wrapRoomKey,
    };
});

// Допустимый base64-плейсхолдер публичного ключа (32 байта). Не секрет.
const VALID_PUBKEY_B64 = btoa("mock1234mock1234mock1234mock1234");

function setupMockPb(config: MockPbConfig) {
    mockState.batchOps.length = 0;
    mockState.createBatchCalls = 0;
    mockState.sendCalls = 0;

    const data: Record<string, MockRecord[]> = {
        [DB_TABLES.USERS]: config.users ?? [],
        [DB_TABLES.ROOMS]: config.rooms ?? [],
        [DB_TABLES.ROOM_MEMBERS]: config.roomMembers ?? [],
        [DB_TABLES.ROOM_KEYS]: config.roomKeys ?? [],
    };

    (pb.collection as Mock).mockImplementation((name: string) => ({
        getOne: vi.fn(async (id: string) => {
            if (
                config.getOneThrow?.collection === name &&
                config.getOneThrow?.id === id
            ) {
                throw config.getOneThrow.error;
            }
            const rec = data[name]?.find((r) => r.id === id);
            if (!rec) {
                throw { status: 404, message: `record ${id} not found` };
            }
            return rec;
        }),
        getFullList: vi.fn(async () => data[name] ?? []),
        getFirstListItem: vi.fn(async () => {
            if (config.firstListItem) {
                return config.firstListItem;
            }
            const list = data[name] ?? [];
            if (list.length === 0) {
                throw { status: 404, message: "no items" };
            }
            return list[0];
        }),
        create: vi.fn(async (d: unknown) => ({
            ...(d as object),
            id: (d as { id?: string })?.id ?? "gen-id",
        })),
    }));

    (pb.send as Mock).mockImplementation(
        async (path: string, options?: { body?: { userIds?: unknown } }) => {
            if (path !== API_ROUTES.USERS_KEYS) {
                return [];
            }
            const ids = Array.isArray(options?.body?.userIds)
                ? options.body.userIds.filter(
                      (id): id is string => typeof id === "string",
                  )
                : [];
            const failure = ids.find(
                (id) =>
                    config.getOneThrow?.collection === DB_TABLES.USERS &&
                    config.getOneThrow?.id === id,
            );
            if (failure) {
                throw config.getOneThrow?.error;
            }
            return ids.flatMap((id) => {
                const record = data[DB_TABLES.USERS].find(
                    (item) => item.id === id,
                );
                const x25519 = record?.public_key_x25519;
                if (typeof x25519 !== "string" || x25519 === "") {
                    return [];
                }
                return [
                    {
                        id,
                        public_key_x25519: x25519,
                        public_key_signing: "mock-signing-key",
                    },
                ];
            });
        },
    );

    (pb.filter as Mock).mockImplementation((tpl: string) => tpl);

    (pb.createBatch as Mock).mockImplementation(() => {
        mockState.createBatchCalls += 1;
        return {
            collection: vi.fn((name: string) => ({
                create: vi.fn((d: unknown) => {
                    mockState.batchOps.push({ collection: name, data: d });
                }),
                delete: vi.fn((id: string) => {
                    mockState.batchOps.push({
                        collection: name,
                        data: { __op: "delete", id },
                    });
                }),
            })),
            send: vi.fn(async () => {
                mockState.sendCalls += 1;
                if (config.batchSendError) {
                    throw config.batchSendError;
                }
            }),
        };
    });

    (pb.files.getURL as Mock).mockImplementation(
        (rec: { id: string }, file: string) => `http://mock/${rec.id}/${file}`,
    );
}

function defaultCryptoMocks() {
    cryptoMocks.generateRoomKey.mockResolvedValue(MOCK_ROOM_KEY);
    cryptoMocks.generateRoomId.mockReturnValue("new-room-id");
    cryptoMocks.wrapRoomKey.mockResolvedValue({
        ephemeralPublicKey: EMPTY_BUF(),
        iv: EMPTY_BUF(),
        ciphertext: EMPTY_BUF(),
    });
}

describe("RoomService (PocketBase)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("VITE_USE_MOCK", "false");

        // encryptRoomKeysForMembers импортирует публичный ключ получателя через
        // window.crypto.subtle.importKey — мокаем, чтобы не запускать реальный crypto.
        if (!window.crypto.subtle) {
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            (window.crypto as any).subtle = {};
        }
        window.crypto.subtle.importKey = vi
            .fn()
            .mockResolvedValue({} as CryptoKey) as SubtleCrypto["importKey"];

        defaultCryptoMocks();
    });

    describe("createRoom", () => {
        it("1. нет валидных участников -> MISSING_KEYS_ERROR", async () => {
            // my-id отсутствует в users -> getOne бросает 404 -> ни одного профиля
            setupMockPb({ users: [] });

            const result = await createRoom({
                name: "Test Room",
                type: "group",
                myUserId: "ghost-id",
                peerIds: [],
            });

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.MISSING_KEYS_ERROR);
                expect(result.error.details).toEqual({ userIds: ["ghost-id"] });
            }
            // комната не создаётся
            expect(mockState.createBatchCalls).toBe(0);
        });

        it("2a. профиль участника не найден -> MISSING_KEYS_ERROR со списком отсутствующих ID", async () => {
            setupMockPb({
                users: [{ id: "my-id", public_key_x25519: VALID_PUBKEY_B64 }],
            });

            const result = await createRoom({
                name: "Test Room",
                type: "group",
                myUserId: "my-id",
                peerIds: ["missing-peer"],
            });

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.MISSING_KEYS_ERROR);
                expect(result.error.details).toEqual({
                    userIds: ["missing-peer"],
                });
            }
            expect(mockState.createBatchCalls).toBe(0);
        });

        it("2b. у участника нет публичного ключа -> MISSING_KEYS_ERROR со списком ID", async () => {
            setupMockPb({
                users: [
                    { id: "my-id", public_key_x25519: VALID_PUBKEY_B64 },
                    { id: "nokey-peer", public_key_x25519: "" },
                ],
            });

            const result = await createRoom({
                name: "Test Room",
                type: "group",
                myUserId: "my-id",
                peerIds: ["nokey-peer"],
            });

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.MISSING_KEYS_ERROR);
                expect(result.error.details).toEqual({
                    userIds: ["nokey-peer"],
                });
            }
            expect(mockState.createBatchCalls).toBe(0);
        });

        it("2c. сетевая ошибка получения профиля (не 404) -> DB_ERROR", async () => {
            setupMockPb({
                users: [{ id: "peer-id", public_key_x25519: VALID_PUBKEY_B64 }],
                getOneThrow: {
                    collection: DB_TABLES.USERS,
                    id: "my-id",
                    error: { status: 500, message: "network" },
                },
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
            expect(mockState.createBatchCalls).toBe(0);
        });

        it("3. все участники валидны -> комната создаётся, ключ шифруется отдельно на каждого", async () => {
            setupMockPb({
                users: [
                    { id: "my-id", public_key_x25519: VALID_PUBKEY_B64 },
                    { id: "peer-id", public_key_x25519: VALID_PUBKEY_B64 },
                ],
            });

            const result = await createRoom({
                name: "Test Room",
                type: "group",
                myUserId: "my-id",
                peerIds: ["peer-id"],
            });

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.roomId).toBe("new-room-id");
                expect(result.value.roomKey).toBe(MOCK_ROOM_KEY);
            }

            // room key генерируется один раз
            expect(cryptoMocks.generateRoomKey).toHaveBeenCalledTimes(1);
            // ключ шифруется отдельно для каждого участника (2 участника -> 2 вызова)
            expect(cryptoMocks.wrapRoomKey).toHaveBeenCalledTimes(2);

            // createRoomWithMembersAndKeys вызывается через batch
            expect(mockState.createBatchCalls).toBe(1);
            expect(mockState.sendCalls).toBe(1);

            const roomCreates = mockState.batchOps.filter(
                (o) => o.collection === DB_TABLES.ROOMS,
            );
            const memberCreates = mockState.batchOps.filter(
                (o) => o.collection === DB_TABLES.ROOM_MEMBERS,
            );
            const keyCreates = mockState.batchOps.filter(
                (o) => o.collection === DB_TABLES.ROOM_KEYS,
            );

            expect(roomCreates).toHaveLength(1);
            expect(roomCreates[0].data).toEqual({
                id: "new-room-id",
                type: "group",
                name: "Test Room",
                created_by: "my-id",
                visibility: ROOM_VISIBILITY.PRIVATE,
            });

            expect(memberCreates).toHaveLength(2);
            expect(memberCreates[0].data).toMatchObject({
                room: "new-room-id",
                user: "my-id",
                role: MEMBER_ROLE.OWNER,
                unread_count: 0,
            });
            expect(memberCreates[1].data).toMatchObject({
                room: "new-room-id",
                user: "peer-id",
                role: MEMBER_ROLE.MEMBER,
                unread_count: 0,
            });

            expect(keyCreates).toHaveLength(2);
            expect(keyCreates[0].data).toMatchObject({
                room: "new-room-id",
                user: "my-id",
            });
            expect(keyCreates[1].data).toMatchObject({
                room: "new-room-id",
                user: "peer-id",
            });
        });
        it("4. ошибка encryptRoomKeysForMembers -> комната не создаётся, возвращается CRYPTO_ERROR", async () => {
            setupMockPb({
                users: [
                    { id: "my-id", public_key_x25519: VALID_PUBKEY_B64 },
                    { id: "peer-id", public_key_x25519: VALID_PUBKEY_B64 },
                ],
            });
            cryptoMocks.wrapRoomKey.mockRejectedValueOnce(
                new Error("wrap failed"),
            );

            const result = await createRoom({
                name: "Test Room",
                type: "group",
                myUserId: "my-id",
                peerIds: ["peer-id"],
            });

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.CRYPTO_ERROR);
            }
            // комната не создаётся — batch не вызывается
            expect(mockState.createBatchCalls).toBe(0);
            expect(mockState.sendCalls).toBe(0);
            expect(mockState.batchOps).toHaveLength(0);
        });

        it("5. ошибка PocketBase создания комнаты (batch.send) -> DB_ERROR", async () => {
            setupMockPb({
                users: [
                    { id: "my-id", public_key_x25519: VALID_PUBKEY_B64 },
                    { id: "peer-id", public_key_x25519: VALID_PUBKEY_B64 },
                ],
                batchSendError: new Error("PB batch error"),
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
            // batch был вызван, но send отвергнут
            expect(mockState.createBatchCalls).toBe(1);
            expect(mockState.sendCalls).toBe(1);
        });

        it("6. дублирующиеся user IDs не создают дублирующихся участников", async () => {
            setupMockPb({
                users: [
                    { id: "my-id", public_key_x25519: VALID_PUBKEY_B64 },
                    { id: "peer-id", public_key_x25519: VALID_PUBKEY_B64 },
                ],
            });

            const result = await createRoom({
                name: "Test Room",
                type: "group",
                myUserId: "my-id",
                peerIds: ["peer-id", "peer-id"],
            });

            expect(result.isOk()).toBe(true);
            const memberCreates = mockState.batchOps.filter(
                (o) => o.collection === DB_TABLES.ROOM_MEMBERS,
            );
            const keyCreates = mockState.batchOps.filter(
                (o) => o.collection === DB_TABLES.ROOM_KEYS,
            );
            // 2 участника, а не 3 — дубликат peer-id схлопнут
            expect(memberCreates).toHaveLength(2);
            expect(keyCreates).toHaveLength(2);

            // my-id повторно в peerIds — тоже не дублирует
            mockState.batchOps.length = 0;
            const result2 = await createRoom({
                name: "Test Room 2",
                type: "group",
                myUserId: "my-id",
                peerIds: ["my-id", "peer-id"],
            });
            expect(result2.isOk()).toBe(true);
            const memberCreates2 = mockState.batchOps.filter(
                (o) => o.collection === DB_TABLES.ROOM_MEMBERS,
            );
            expect(memberCreates2).toHaveLength(2);
        });

        it("7. ни ключи, ни plaintext не попадают в payload создания", async () => {
            setupMockPb({
                users: [
                    { id: "my-id", public_key_x25519: VALID_PUBKEY_B64 },
                    { id: "peer-id", public_key_x25519: VALID_PUBKEY_B64 },
                ],
            });

            const result = await createRoom({
                name: "Test Room",
                type: "group",
                myUserId: "my-id",
                peerIds: ["peer-id"],
            });

            expect(result.isOk()).toBe(true);

            const keyCreates = mockState.batchOps.filter(
                (o) => o.collection === DB_TABLES.ROOM_KEYS,
            );
            // encrypted_key — сериализованный JSON без сырого ключа и plaintext:
            // wrapRoomKey возвращает пустые буферы -> base64 пустой строки
            for (const op of keyCreates) {
                const payload = op.data as { encrypted_key: string };
                const parsed = JSON.parse(payload.encrypted_key);
                expect(parsed).toEqual({
                    ephemeralPublicKey: "",
                    iv: "",
                    ciphertext: "",
                });
            }
        });
    });

    describe("addMembersToGroup", () => {
        it("не найденный участник -> MISSING_KEYS_ERROR со списком отсутствующих ID", async () => {
            setupMockPb({
                users: [
                    {
                        id: "new-member-1",
                        public_key_x25519: VALID_PUBKEY_B64,
                    },
                ],
            });

            const result = await addMembersToGroup({
                roomId: "room-1",
                newMemberIds: ["new-member-1", "missing-member"],
                roomKey: MOCK_ROOM_KEY,
                myUserId: "my-id",
            });

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.MISSING_KEYS_ERROR);
                expect(result.error.details).toEqual({
                    userIds: ["missing-member"],
                });
            }
            // участники не добавляются — batch/send не вызывается
            expect(mockState.createBatchCalls).toBe(0);
            expect(mockState.sendCalls).toBe(0);
        });
    });

    describe("findOrCreateDM", () => {
        it("должен вернуть ID существующей комнаты, если она найдена", async () => {
            setupMockPb({
                roomMembers: [
                    {
                        id: "m1",
                        room: "existing-room",
                        user: "my-id",
                        role: "member",
                    },
                ],
                rooms: [
                    {
                        id: "existing-room",
                        type: "direct",
                        name: "Test",
                        visibility: "private",
                        created_by: "my-id",
                        created: "2026-01-01T00:00:00.000Z",
                        updated: "2026-01-01T00:00:00.000Z",
                    },
                ],
                firstListItem: {
                    id: "m2",
                    room: "existing-room",
                    user: "target-id",
                    role: "member",
                },
            });

            const result = await findOrCreateDM({
                currentUserId: "my-id",
                targetUserId: "target-id",
            });

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value).toBe("existing-room");
            }
        });
    });
});
