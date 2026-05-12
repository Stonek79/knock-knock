import Dexie, { type Table } from "dexie";
import { MEDIA_CACHE_FIELDS, MEDIA_REFERENCE_TYPES } from "../constants";
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
            // *references.id - мульти-индекс для поиска по ID связей (messageId/roomId)
            // roomId - индекс для поиска всех медиа комнаты (в т.ч. эфемерных)
            media_cache: `${MEDIA_CACHE_FIELDS.ID}, *${MEDIA_CACHE_FIELDS.REFERENCES}.id, ${MEDIA_CACHE_FIELDS.ROOM_ID}, ${MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT}, ${MEDIA_CACHE_FIELDS.SYNC_STATUS}`,
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

    /**
     * Частичное обновление записи в кэше (PATCH).
     * Полезно для добавления оригинала без затирания превью.
     */
    update: async ({
        id,
        userId,
        changes,
    }: {
        id: string;
        userId: string;
        changes: Partial<MediaCacheItem>;
    }): Promise<void> => {
        const db = getMediaDB(userId);
        return db.transaction("rw", db.media_cache, async () => {
            const item = await db.media_cache.get(id);
            if (item) {
                await db.media_cache.put({
                    ...item,
                    ...changes,
                    [MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT]: Date.now(),
                });
            }
        });
    },

    /**
     * Возвращает суммарный размер кэша в байтах для конкретного пользователя.
     */
    getCacheSize: async (userId: string): Promise<number> => {
        const db = getMediaDB(userId);
        let totalSize = 0;
        await db.media_cache.each((item) => {
            const blob = item[MEDIA_CACHE_FIELDS.BLOB];
            if (blob) {
                totalSize += blob.size;
            }
            const thumbnail = item[MEDIA_CACHE_FIELDS.THUMBNAIL];
            if (thumbnail) {
                totalSize += thumbnail.size;
            }
        });
        return totalSize;
    },

    /**
     * Очищает весь кэш медиа для конкретного пользователя.
     */
    clearAll: async (userId: string): Promise<void> => {
        const db = getMediaDB(userId);
        return db.media_cache.clear();
    },

    /**
     * Удаляет конкретный файл из кэша по его ID.
     */
    delete: async ({
        id,
        userId,
    }: {
        id: string;
        userId: string;
    }): Promise<void> => {
        const db = getMediaDB(userId);
        return db.media_cache.delete(id);
    },

    /**
     * Удаляет все медиа-записи, связанные с конкретным сообщением.
     * Используется при Soft Delete сообщения для очистки локального кэша.
     * Обходит только записи по мульти-индексу references.id для эффективности.
     */
    deleteByMessageId: async ({
        messageId,
        userId,
    }: {
        messageId: string;
        userId: string;
    }): Promise<void> => {
        const db = getMediaDB(userId);
        return db.transaction("rw", db.media_cache, async () => {
            // Получаем все записи, у которых есть ссылка на данное сообщение (по мульти-индексу)
            const candidates = await db.media_cache
                .where(`${MEDIA_CACHE_FIELDS.REFERENCES}.id`)
                .equals(messageId)
                .toArray();

            // Фильтруем: нас интересуют только references с type === 'message'
            const toDelete = candidates
                .filter((item) =>
                    item.references.some(
                        (ref) =>
                            ref.type === MEDIA_REFERENCE_TYPES.MESSAGE &&
                            ref.id === messageId,
                    ),
                )
                .map((item) => item[MEDIA_CACHE_FIELDS.ID]);

            if (toDelete.length > 0) {
                await db.media_cache.bulkDelete(toDelete);
            }
        });
    },

    /**
     * Удаляет все медиа-записи, связанные с комнатой (аватар и все медиа сообщений).
     * Используется при полном удалении комнаты (например, эфемерной).
     */
    deleteByRoomId: async ({
        roomId,
        userId,
    }: {
        roomId: string;
        userId: string;
    }): Promise<void> => {
        const db = getMediaDB(userId);
        return db.transaction("rw", db.media_cache, async () => {
            // Ищем все записи, у которых roomId совпадает с удаляемой комнатой
            const toDelete = await db.media_cache
                .where(MEDIA_CACHE_FIELDS.ROOM_ID)
                .equals(roomId)
                .primaryKeys();

            if (toDelete.length > 0) {
                await db.media_cache.bulkDelete(toDelete);
            }
        });
    },
};
