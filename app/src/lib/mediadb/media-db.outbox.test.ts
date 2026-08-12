import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredMessage = {
    id: string;
    roomId: string;
    userId: string;
    token: string;
    payload: { text: string };
    timestamp: number;
    status: "pending" | "failed";
    retryCount: number;
};

const databases = new Map<string, Map<string, StoredMessage>>();

class FakeDexie {
    outbox: {
        put: (message: StoredMessage) => Promise<void>;
        where: (field: string) => {
            equals: (value: string) => {
                toArray: () => Promise<StoredMessage[]>;
            };
        };
        update: (
            id: string,
            updates: Partial<StoredMessage>,
        ) => Promise<number>;
        delete: (id: string) => Promise<void>;
    };

    constructor(name: string) {
        const records = databases.get(name) ?? new Map<string, StoredMessage>();
        databases.set(name, records);
        this.outbox = {
            put: async (message) => {
                records.set(message.id, message);
            },
            where: (field) => ({
                equals: (value) => ({
                    toArray: async () =>
                        [...records.values()].filter(
                            (message) =>
                                message[field as keyof StoredMessage] === value,
                        ),
                }),
            }),
            update: async (id, updates) => {
                const message = records.get(id);
                if (!message) {
                    return 0;
                }
                records.set(id, { ...message, ...updates });
                return 1;
            },
            delete: async (id) => {
                records.delete(id);
            },
        };
    }

    version() {
        return { stores: () => undefined };
    }
}

vi.mock("dexie", () => ({ default: FakeDexie }));

const { outboxDb } = await import("./media-db");

const makeMessage = (
    userId: string,
    id: string,
    status: "pending" | "failed" = "pending",
): StoredMessage => ({
    id,
    roomId: "room-1",
    userId,
    token: "test-token",
    payload: { text: "encrypted test payload" },
    timestamp: 1,
    status,
    retryCount: 0,
});

describe("outboxDb", () => {
    beforeEach(() => {
        databases.clear();
    });

    it("сохраняет и возвращает только pending-сообщения пользователя", async () => {
        const ownPending = makeMessage("user-a", "message-a");
        const ownFailed = makeMessage("user-a", "message-failed", "failed");
        const otherUser = makeMessage("user-b", "message-b");

        await outboxDb.add("user-a", ownPending);
        await outboxDb.add("user-a", ownFailed);
        await outboxDb.add("user-b", otherUser);

        await expect(outboxDb.getPending("user-a")).resolves.toEqual([
            ownPending,
        ]);
        await expect(outboxDb.getPending("user-b")).resolves.toEqual([
            otherUser,
        ]);
    });

    it("обновляет статус и retryCount, затем удаляет сообщение", async () => {
        const message = makeMessage("user-a", "message-a");
        await outboxDb.add("user-a", message);

        await outboxDb.updateStatus("user-a", message.id, "pending", 3);
        expect(await outboxDb.getPending("user-a")).toEqual([
            { ...message, retryCount: 3 },
        ]);

        await outboxDb.updateStatus("user-a", message.id, "failed");
        await expect(outboxDb.getPending("user-a")).resolves.toEqual([]);

        await outboxDb.remove("user-a", message.id);
        await expect(outboxDb.getPending("user-a")).resolves.toEqual([]);
    });
});
