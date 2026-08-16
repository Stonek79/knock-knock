import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomWithMembers } from "../types";

/**
 * Юнит-тесты постоянного кеша списка комнат.
 * Не подключаются к PocketBase и не используют реальную IndexedDB (FakeDexie).
 * Проверяют продуктовый контракт:
 *  - изоляцию кеша по userId и PB URL (детерминированные имена БД);
 *  - cache miss / cache hit и очистку;
 *  - хранение сырых данных (без расшифрованного plaintext).
 */

type CacheStore = Map<string, Map<string, { savedAt: string; rooms: unknown }>>;

const databases: CacheStore = new Map();

class FakeDexie {
    cache: {
        put: (entry: {
            id: string;
            savedAt: string;
            rooms: unknown;
        }) => Promise<void>;
        get: (
            id: string,
        ) => Promise<
            { id: string; savedAt: string; rooms: unknown } | undefined
        >;
        clear: () => Promise<void>;
    };

    constructor(name: string) {
        const records =
            databases.get(name) ??
            new Map<string, { savedAt: string; rooms: unknown }>();
        databases.set(name, records);

        this.cache = {
            put: async (entry) => {
                records.set(entry.id, {
                    savedAt: entry.savedAt,
                    rooms: entry.rooms,
                });
            },
            get: async (id) => {
                const rec = records.get(id);
                return rec
                    ? { id, savedAt: rec.savedAt, rooms: rec.rooms }
                    : undefined;
            },
            clear: async () => {
                records.clear();
            },
        };
    }

    version() {
        return { stores: () => undefined };
    }
}

vi.mock("dexie", () => ({ default: FakeDexie }));

// Импортируем реальный модуль поверх замоканного dexie.
// Динамический импорт (а не static) нужен, чтобы factory `vi.mock("dexie")` отработал
// уже после инициализации FakeDexie (см. паттерн media-db.outbox.test.ts).
const {
    roomListDb,
    getRoomListDbName,
    getLegacyRoomListDbPrefix,
    purgeLegacyRoomListCaches,
} = await import("./room-list-db");

const makeRoom = (id: string): RoomWithMembers => ({
    id,
    name: `room-${id}`,
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
        // Ciphertext (не plaintext) — то, что получаем с сервера.
        content: "ciphertext:NOT-PLAINTEXT",
        created: "2026-01-01T00:00:00.000Z",
        is_deleted: false,
        iv: "iv-placeholder",
    },
});

describe("roomListDb", () => {
    beforeEach(() => {
        databases.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("cache miss возвращает null для пустого кеша", async () => {
        await expect(roomListDb.load("user-a")).resolves.toBeNull();
    });

    it("cache hit возвращает сохранённый список", async () => {
        const rooms = [makeRoom("r1"), makeRoom("r2")];
        await roomListDb.save("user-a", rooms);
        await expect(roomListDb.load("user-a")).resolves.toEqual(rooms);
    });

    it("сохранённый пустой список [] является cache hit (не cache miss)", async () => {
        await roomListDb.save("user-a", []);
        await expect(roomListDb.load("user-a")).resolves.toEqual([]);
    });

    it("повреждённый кеш (malformed) обрабатывается как cache miss", async () => {
        // Запись в IndexedDB существует, но не проходит roomWithMembersSchema
        // (отсутствуют обязательные поля) — не передаём её в decrypt/UI.
        const malformed = [{ id: "r1" }];
        await roomListDb.save(
            "user-a",
            malformed as unknown as RoomWithMembers[],
        );
        await expect(roomListDb.load("user-a")).resolves.toBeNull();
    });

    it("сохраняет сырой (зашифрованный) last_message, а не plaintext", async () => {
        const rooms = [makeRoom("r1")];
        await roomListDb.save("user-a", rooms);
        const cached = await roomListDb.load("user-a");
        expect(cached?.[0].last_message?.content).toBe(
            "ciphertext:NOT-PLAINTEXT",
        );
    });

    it("изолирует кеш по userId: разные пользователи не видят данные друг друга", async () => {
        await roomListDb.save("user-a", [makeRoom("a1")]);

        await expect(roomListDb.load("user-b")).resolves.toBeNull();
        // Повторный hit для user-a не задет отсутствием данных user-b
        await expect(roomListDb.load("user-a")).resolves.toEqual([
            makeRoom("a1"),
        ]);
    });

    it("очищает кеш пользователя", async () => {
        await roomListDb.save("user-a", [makeRoom("a1")]);
        await roomListDb.clear("user-a");
        await expect(roomListDb.load("user-a")).resolves.toBeNull();
    });
});

describe("purgeLegacyRoomListCaches — очистка legacy host-based баз", () => {
    it("удаляет legacy host-базы и не трогает актуальные origin/чужие базы", async () => {
        const deleteSpy = vi.fn();
        const databasesSpy = vi.fn().mockResolvedValue([
            { name: "Nemo_RoomList_api_example_com_u1" }, // legacy (host)
            {
                name: "Nemo_RoomList_https___api_example_com_u1",
            }, // текущая (origin)
            { name: "Unrelated_DB" },
        ]);
        vi.stubGlobal("indexedDB", {
            databases: databasesSpy,
            deleteDatabase: deleteSpy,
        });

        await purgeLegacyRoomListCaches("https://api.example.com");

        expect(deleteSpy).toHaveBeenCalledWith(
            "Nemo_RoomList_api_example_com_u1",
        );
        expect(deleteSpy).not.toHaveBeenCalledWith(
            "Nemo_RoomList_https___api_example_com_u1",
        );
        expect(deleteSpy).not.toHaveBeenCalledWith("Unrelated_DB");
    });

    it("не падает и не удаляет ничего, если indexedDB.databases недоступен", async () => {
        vi.stubGlobal("indexedDB", undefined);
        await expect(
            purgeLegacyRoomListCaches("https://api.example.com"),
        ).resolves.toBeUndefined();
    });

    it("legacy-префикс строится из host (без протокола)", () => {
        expect(getLegacyRoomListDbPrefix("https://api.example.com:8090")).toBe(
            "Nemo_RoomList_api_example_com_8090_",
        );
    });
});

describe("getRoomListDbName — изоляция по userId и PB URL", () => {
    it("разные PB URL дают разные имена БД для одного пользователя", () => {
        const forDev = getRoomListDbName("https://dev-api.example.com", "u1");
        const forProd = getRoomListDbName("https://api.example.com", "u1");
        expect(forDev).not.toBe(forProd);
    });

    it("разные userId дают разные имена БД для одного PB URL", () => {
        const userA = getRoomListDbName("https://api.example.com", "user-a");
        const userB = getRoomListDbName("https://api.example.com", "user-b");
        expect(userA).not.toBe(userB);
    });

    it("одинаковые userId и PB URL дают стабильное имя (hit в один и тот же кеш)", () => {
        const first = getRoomListDbName("https://api.example.com", "u1");
        const second = getRoomListDbName("https://api.example.com", "u1");
        expect(first).toBe(second);
    });

    it("разный протокол (http/https) даёт разные имена БД для одного host и userId", () => {
        const http = getRoomListDbName("http://api.example.com", "u1");
        const https = getRoomListDbName("https://api.example.com", "u1");
        expect(http).not.toBe(https);
        // Протокол реально участвует в имени, а не только host.
        expect(http).toContain("http___api_example_com");
        expect(https).toContain("https___api_example_com");
    });

    it("разный порт даёт разные имена БД для одного protocol/host и userId", () => {
        const first = getRoomListDbName("https://dev.example.com:8090", "u1");
        const second = getRoomListDbName("https://dev.example.com:9090", "u1");
        expect(first).not.toBe(second);
    });

    it("невалидный PB URL деградирует в 'default' без падения", () => {
        expect(getRoomListDbName("not-a-url", "u1")).toContain("default");
    });
});
