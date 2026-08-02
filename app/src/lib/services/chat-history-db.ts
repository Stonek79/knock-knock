import Dexie, { type Table } from "dexie";
import { env } from "../env";
import type { MessageRow } from "../types";

const dbInstances: Record<string, Dexie & { messages: Table<MessageRow> }> = {};

const getDbPrefix = (): string => {
    try {
        const url = new URL(env.VITE_PB_URL);
        return url.host.replace(/[^a-zA-Z0-9]/g, "_");
    } catch {
        return "default";
    }
};

export const getChatHistoryDB = (userId: string) => {
    if (!userId) {
        throw new Error("userId обязателен для инициализации ChatHistoryDB");
    }

    const dbKey = `${getDbPrefix()}_${userId}`;

    if (!dbInstances[dbKey]) {
        const db = new Dexie(`Nemo_ChatHistory_${dbKey}`) as Dexie & {
            messages: Table<MessageRow>;
        };

        db.version(1).stores({
            messages: "id, room, created, updated",
        });

        dbInstances[dbKey] = db;
    }

    return dbInstances[dbKey];
};

export const chatHistoryDb = {
    addBatch: async (userId: string, messages: MessageRow[]): Promise<void> => {
        const db = getChatHistoryDB(userId);
        await db.messages.bulkPut(messages);
    },

    putMessage: async (userId: string, message: MessageRow): Promise<void> => {
        const db = getChatHistoryDB(userId);
        await db.messages.put(message);
    },

    getRoomMessages: async (
        userId: string,
        roomId: string,
    ): Promise<MessageRow[]> => {
        const db = getChatHistoryDB(userId);
        return db.messages
            .where("room")
            .equals(roomId)
            .reverse()
            .sortBy("created");
    },

    getLastUpdated: async (
        userId: string,
        roomId: string,
    ): Promise<string | null> => {
        const db = getChatHistoryDB(userId);
        const latest = await db.messages
            .where("room")
            .equals(roomId)
            .reverse()
            .sortBy("updated");
        return latest.length > 0 ? latest[0].updated : null;
    },

    removeMessage: async (userId: string, messageId: string): Promise<void> => {
        const db = getChatHistoryDB(userId);
        await db.messages.delete(messageId);
    },

    clearRoom: async (userId: string, roomId: string): Promise<void> => {
        const db = getChatHistoryDB(userId);
        await db.messages.where("room").equals(roomId).delete();
    },

    clearAll: async (userId: string): Promise<void> => {
        const db = getChatHistoryDB(userId);
        await db.messages.clear();
    },
};
