import Dexie, { type Table } from "dexie";
import { env } from "../env";
import type { Attachment } from "../types";

export interface OutboxMessage {
    id: string; // uuid
    roomId: string;
    senderId: string;
    content: string; // encrypted ciphertext
    iv: string; // encrypted iv
    attachments?: Attachment[];
    metadata?: Record<string, unknown>;
    createdAt: number;
}

const dbInstances: Record<string, Dexie & { outbox: Table<OutboxMessage> }> =
    {};

const getDbPrefix = (): string => {
    try {
        const url = new URL(env.VITE_PB_URL);
        return url.host.replace(/[^a-zA-Z0-9]/g, "_");
    } catch {
        return "default";
    }
};

export const getOutboxDB = (userId: string) => {
    if (!userId) {
        throw new Error("userId обязателен для инициализации OutboxDB");
    }

    const dbKey = `${getDbPrefix()}_${userId}`;

    if (!dbInstances[dbKey]) {
        const db = new Dexie(`Nemo_Outbox_${dbKey}`) as Dexie & {
            outbox: Table<OutboxMessage>;
        };

        db.version(1).stores({
            outbox: "id, roomId, createdAt",
        });

        dbInstances[dbKey] = db;
    }

    return dbInstances[dbKey];
};

export const outboxDb = {
    add: async (userId: string, message: OutboxMessage): Promise<void> => {
        const db = getOutboxDB(userId);
        await db.outbox.put(message);
    },

    getAll: async (userId: string): Promise<OutboxMessage[]> => {
        const db = getOutboxDB(userId);
        return db.outbox.orderBy("createdAt").toArray();
    },

    remove: async (userId: string, id: string): Promise<void> => {
        const db = getOutboxDB(userId);
        await db.outbox.delete(id);
    },

    clear: async (userId: string): Promise<void> => {
        const db = getOutboxDB(userId);
        await db.outbox.clear();
    },
};
