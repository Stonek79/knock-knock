import Dexie, { type Table } from "dexie";
import { MEDIA_CACHE_FIELDS } from "../constants";
import type { MediaCacheItem, MediaReference } from "../types";

/**
 * Пул экземпляров БД для избежания повторных инициализаций
 */
const dbInstances: Record<
    string,
    Dexie & { media_cache: Table<MediaCacheItem> }
> = {};

/**
 * Фабрика для создания/получения инстанса БД конкретного пользователя.
 */
export const getMediaDB = (userId: string) => {
    if (!userId) {
        throw new Error("userId обязателен для инициализации MediaDB");
    }

    if (!dbInstances[userId]) {
        const db = new Dexie(`KnockKnock_Media_${userId}`) as Dexie & {
            media_cache: Table<MediaCacheItem>;
        };

        db.version(1).stores({
            // id - первичный ключ
            // *references.id - мульти-индекс для поиска по ID связей
            media_cache: `${MEDIA_CACHE_FIELDS.ID}, *${MEDIA_CACHE_FIELDS.REFERENCES}.id, ${MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT}, ${MEDIA_CACHE_FIELDS.SYNC_STATUS}`,
        });

        dbInstances[userId] = db;
    }

    return dbInstances[userId];
};

/**
 * ОБЪЕКТ ДЛЯ РАБОТЫ С МЕДИА-БАЗОЙ (Functional approach)
 */
export const mediaDb = {
    /**
     * Получает файл и обновляет время последнего доступа (атомарно).
     */
    getWithAccessUpdate: async ({
        id,
        userId,
    }: {
        id: string;
        userId: string;
    }): Promise<MediaCacheItem | undefined> => {
        const db = getMediaDB(userId);
        return db.transaction("rw", db.media_cache, async () => {
            const item = await db.media_cache.get(id);
            if (item) {
                const updatedItem = {
                    ...item,
                    [MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT]: Date.now(),
                };
                await db.media_cache.put(updatedItem);
                return updatedItem;
            }
            return undefined;
        });
    },

    /**
     * Атомарно добавляет ссылку на файл.
     */
    addReference: async ({
        id,
        userId,
        ref,
    }: {
        id: string;
        userId: string;
        ref: MediaReference;
    }): Promise<void> => {
        const db = getMediaDB(userId);
        return db.transaction("rw", db.media_cache, async () => {
            const item = await db.media_cache.get(id);
            if (!item) {
                return;
            }

            const exists = item.references.some(
                (r) => r.type === ref.type && r.id === ref.id,
            );

            if (!exists) {
                const updatedItem = {
                    ...item,
                    [MEDIA_CACHE_FIELDS.REFERENCES]: [...item.references, ref],
                    [MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT]: Date.now(),
                };
                await db.media_cache.put(updatedItem);
            }
        });
    },

    /**
     * Атомарно удаляет ссылку на файл.
     */
    removeReference: async ({
        id,
        userId,
        refId,
    }: {
        id: string;
        userId: string;
        refId: string;
    }): Promise<void> => {
        const db = getMediaDB(userId);
        return db.transaction("rw", db.media_cache, async () => {
            const item = await db.media_cache.get(id);
            if (!item) {
                return;
            }

            const updatedItem = {
                ...item,
                [MEDIA_CACHE_FIELDS.REFERENCES]: item.references.filter(
                    (r) => r.id !== refId,
                ),
                [MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT]: Date.now(),
            };
            await db.media_cache.put(updatedItem);
        });
    },

    /**
     * Сохранение новой записи в кэш.
     */
    put: async ({
        item,
        userId,
    }: {
        item: MediaCacheItem;
        userId: string;
    }): Promise<string> => {
        const db = getMediaDB(userId);
        return db.media_cache.put(item);
    },
};
