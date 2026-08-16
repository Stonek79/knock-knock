import Dexie, { type Table } from "dexie";
import { env } from "../env";
import type { RoomWithMembers } from "../types";

/**
 * Постоянный кеш списка комнат для cache-first загрузки после reload.
 *
 * Хранит ТОЛЬКО сырые (нерасшифрованные) RoomWithMembers: last_message остаётся
 * в виде ciphertext, полученного с сервера. Расшифровка превью выполняется при
 * отображении и не попадает в IndexedDB, чтобы не сохранять plaintext сообщений.
 *
 * Кеш разбит по userId и PB environment: имя БД детерминированно выводится из
 * host PocketBase URL и userId, поэтому данные одного аккаунта/environment не
 * пересекаются с другим и «переживают» перезагрузку страницы.
 */

interface RoomListCacheEntry {
    id: "rooms";
    savedAt: string;
    rooms: RoomWithMembers[];
}

export type RoomListDB = Dexie & { cache: Table<RoomListCacheEntry> };

const dbInstances: Record<string, RoomListDB> = {};

/**
 * Детерминированное имя IndexedDB-базы для изоляции кеша по PB environment и userId.
 */
export const getRoomListDbName = (pbUrl: string, userId: string): string => {
    let prefix = "default";
    try {
        const url = new URL(pbUrl);
        prefix = url.host.replace(/[^a-zA-Z0-9]/g, "_");
    } catch {
        prefix = "default";
    }
    return `Nemo_RoomList_${prefix}_${userId}`;
};

const getDbName = (userId: string): string =>
    getRoomListDbName(env.VITE_PB_URL, userId);

export const getRoomListDB = (dbName: string): RoomListDB => {
    if (!dbInstances[dbName]) {
        const db = new Dexie(dbName) as RoomListDB;
        db.version(1).stores({
            cache: "id, savedAt",
        });
        dbInstances[dbName] = db;
    }
    return dbInstances[dbName];
};

export const roomListDb = {
    /**
     * Сохранить сырой список комнат (с ciphertext last_message) в кеш пользователя.
     */
    save: async (userId: string, rooms: RoomWithMembers[]): Promise<void> => {
        const db = getRoomListDB(getDbName(userId));
        await db.cache.put({
            id: "rooms",
            savedAt: new Date().toISOString(),
            rooms,
        });
    },

    /**
     * Вернуть сырой список комнат из кеша или null при cache miss / пустом кеше.
     */
    load: async (userId: string): Promise<RoomWithMembers[] | null> => {
        const db = getRoomListDB(getDbName(userId));
        const entry = await db.cache.get("rooms");
        return entry && entry.rooms.length > 0 ? entry.rooms : null;
    },

    /**
     * Очистить кеш списка комнат пользователя.
     */
    clear: async (userId: string): Promise<void> => {
        const db = getRoomListDB(getDbName(userId));
        await db.cache.clear();
    },
};
