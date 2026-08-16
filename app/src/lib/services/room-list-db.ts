import Dexie, { type Table } from "dexie";
import { z } from "zod";
import { env } from "../env";
import { roomWithMembersSchema } from "../schemas/room";
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
 * Включает полный origin (протокол://host[:port]), чтобы http/https, dev/prod и
 * разные порты никогда не разделяли один кеш.
 */
export const getRoomListDbName = (pbUrl: string, userId: string): string => {
    let prefix = "default";
    try {
        const url = new URL(pbUrl);
        prefix = url.origin.replace(/[^a-zA-Z0-9]/g, "_");
    } catch {
        prefix = "default";
    }
    return `Nemo_RoomList_${prefix}_${userId}`;
};

const getDbName = (userId: string): string =>
    getRoomListDbName(env.VITE_PB_URL, userId);

const sanitizeSegment = (value: string): string =>
    value.replace(/[^a-zA-Z0-9]/g, "_");

/**
 * Префикс имени legacy IndexedDB-базы, выведенный из host (без протокола/порта).
 * До перехода на origin имя строилось из host PocketBase URL; такие базы могут
 * содержать чувствительные ciphertext-списки комнат старых сессий.
 */
export const getLegacyRoomListDbPrefix = (pbUrl: string): string => {
    try {
        const url = new URL(pbUrl);
        return `Nemo_RoomList_${sanitizeSegment(url.host)}_`;
    } catch {
        return "Nemo_RoomList_";
    }
};

/**
 * Удаляет legacy IndexedDB-базы, созданные до перехода имени кеша с host на
 * origin. Не трогает актуальные origin-базы. Best-effort: если
 * `indexedDB.databases()` недоступен (старый браузер / тестовое окружение),
 * очистка пропускается без падения, но не «теряет» записи по неосторожности.
 */
export async function purgeLegacyRoomListCaches(pbUrl: string): Promise<void> {
    const idb = typeof indexedDB === "undefined" ? null : indexedDB;
    if (!idb || typeof idb.databases !== "function") {
        return;
    }
    const legacyPrefix = getLegacyRoomListDbPrefix(pbUrl);
    const originPrefix = getRoomListDbName(pbUrl, "");

    let names: string[];
    try {
        names = (await idb.databases())
            .map((d) => d.name ?? "")
            .filter((name): name is string => name.length > 0);
    } catch {
        // Очистка недоступна — пропускаем, не выбрасывая ошибку в UI.
        return;
    }

    for (const name of names) {
        // Только legacy host-based базы; origin-базы и чужие БД не удаляем.
        if (name.startsWith(legacyPrefix) && !name.startsWith(originPrefix)) {
            try {
                idb.deleteDatabase(name);
            } catch {
                // Пропускаем недоступную/занятую базу.
            }
        }
    }
}

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
     * Вернуть сырой список комнат из кеша.
     * Сохранённый пустой список (`[]`) — корректный cache hit; отсутствие записи
     * или повреждённый (не прошедший roomWithMembersSchema) кеш — cache miss (null).
     * Повреждённые данные не передаются в decrypt/UI.
     */
    load: async (userId: string): Promise<RoomWithMembers[] | null> => {
        const db = getRoomListDB(getDbName(userId));
        const entry = await db.cache.get("rooms");
        if (!entry) {
            return null;
        }
        const parsed = z.array(roomWithMembersSchema).safeParse(entry.rooms);
        if (!parsed.success) {
            return null;
        }
        return parsed.data;
    },

    /**
     * Очистить кеш списка комнат пользователя.
     */
    clear: async (userId: string): Promise<void> => {
        const db = getRoomListDB(getDbName(userId));
        await db.cache.clear();
    },
};
