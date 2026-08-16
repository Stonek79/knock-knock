import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { DB_TABLES } from "../constants";
import { pb } from "../pocketbase";
import type { RoomWithMembers } from "../types";
import { appError, err, ok } from "../utils/result";
import { messageRepository } from "./message.repository";

/**
 * Юнит-тесты критического пути списка комнат (N+1-устранение).
 * Не подключаются к PocketBase / IndexedDB.
 * Продуктовый контракт:
 *  - `getUserRooms` (критический путь) НЕ ожидает N+1-запрос последних сообщений
 *    и берёт last_message из локального кеша;
 *  - полный серверный снимок с last-msgs (`getUserRoomsWithLastMessages`)
 *    выполняется в фоне и содержит ожидание пакетного запроса.
 */

vi.mock("@/lib/pocketbase", () => ({
    pb: {
        collection: vi.fn(),
        filter: vi.fn(() => "filter"),
        files: { getURL: vi.fn() },
    },
}));

vi.mock("../services/RealtimeGateway", () => ({
    realtimeGateway: { subscribe: vi.fn().mockResolvedValue(() => {}) },
}));

vi.mock("./mappers/roomMapper", () => ({
    RoomMapper: {
        toDomain: vi.fn((rec: Record<string, unknown>) => ({
            ...rec,
            room_members: [],
            metadata: {},
            permissions: {},
            last_message: null,
        })),
    },
}));

const messageMocks = vi.hoisted(() => ({
    getLastVisibleMessageBatch: vi.fn(),
}));
vi.mock("./message.repository", () => ({
    messageRepository: {
        getLastVisibleMessageBatch: messageMocks.getLastVisibleMessageBatch,
    },
}));

const dbMocks = vi.hoisted(() => ({
    load: vi.fn(),
}));
vi.mock("../services/room-list-db", () => ({
    roomListDb: { load: dbMocks.load },
}));

// Импорт поверх моков (динамически, чтобы factory отработали после hoisting)
const { roomRepository } = await import("./room.repository");

const member = (room: string, user: string) => ({
    id: `m-${room}`,
    room,
    user_id: user,
});

const roomRecord = (id: string) => ({
    id,
    name: null,
    type: "direct",
    visibility: "private",
    avatar_url: null,
    created_by: "creator",
    created_at: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-01T00:00:00.000Z",
});

const lastMsg = (id: string) => ({
    id,
    content: "CIPHERTEXT",
    created: "2026-01-01T00:00:00.000Z",
    is_deleted: false,
    iv: "iv",
});

beforeEach(() => {
    vi.clearAllMocks();

    (pb.collection as Mock).mockImplementation((name: string) => ({
        getFullList: vi.fn(async () => {
            if (name === DB_TABLES.ROOM_MEMBERS) {
                return [member("r1", "u1"), member("r2", "u1")];
            }
            if (name === DB_TABLES.ROOMS) {
                return [roomRecord("r1"), roomRecord("r2")];
            }
            return [];
        }),
    }));
});

describe("roomRepository.getUserRooms (критический путь)", () => {
    it("НЕ вызывает N+1-запрос последних сообщений (getLastVisibleMessageBatch)", async () => {
        dbMocks.load.mockResolvedValue([
            {
                ...roomRecord("r1"),
                last_message: lastMsg("cached-lm"),
            } as RoomWithMembers,
        ]);

        const result = await roomRepository.getUserRooms("u1");

        if (result.isErr()) {
            throw result.error;
        }

        expect(
            messageRepository.getLastVisibleMessageBatch,
        ).not.toHaveBeenCalled();

        const rooms = result.value;
        // last_message берётся из локального кеша, а не N+1 к серверу
        const r1 = rooms.find((r) => r.id === "r1");
        expect(r1?.last_message?.id).toBe("cached-lm");
    });

    it("при повреждённом кеше продолжает работу без N+1-запроса", async () => {
        dbMocks.load.mockRejectedValue(new Error("IndexedDB broken"));

        const result = await roomRepository.getUserRooms("u1");

        expect(result.isOk()).toBe(true);
        expect(
            messageRepository.getLastVisibleMessageBatch,
        ).not.toHaveBeenCalled();
    });
});

describe("roomRepository.getUserRoomsWithLastMessages (фоновая синхронизация)", () => {
    it("вызывает пакетный запрос последних сообщений и мержит его результат", async () => {
        messageMocks.getLastVisibleMessageBatch.mockResolvedValue(
            ok(new Map([["r1", lastMsg("server-lm")]])),
        );

        const result = await roomRepository.getUserRoomsWithLastMessages("u1");

        if (result.isErr()) {
            throw result.error;
        }

        expect(messageMocks.getLastVisibleMessageBatch).toHaveBeenCalledWith(
            ["r1", "r2"],
            "u1",
        );

        const rooms = result.value;
        const r1 = rooms.find((r) => r.id === "r1");
        expect(r1?.last_message?.id).toBe("server-lm");
        const r2 = rooms.find((r) => r.id === "r2");
        expect(r2?.last_message).toBeNull();
    });

    it("сбой пакетного запроса не роняет список комнат (last_message = null)", async () => {
        messageMocks.getLastVisibleMessageBatch.mockResolvedValue(
            err(appError("network-error", "batch failed")),
        );

        const result = await roomRepository.getUserRoomsWithLastMessages("u1");

        if (result.isErr()) {
            throw result.error;
        }
        const rooms = result.value;
        expect(rooms.every((r) => r.last_message === null)).toBe(true);
    });
});
