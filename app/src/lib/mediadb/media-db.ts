import Dexie, { type Table } from "dexie";
import { MEDIA_CACHE_FIELDS, MEDIA_REFERENCE_TYPES } from "../constants";
import { env } from "../env";
import type { MediaCacheItem, MediaReference } from "../types";

/**
 * Внутренний тип для представления записи в IndexedDB.
 * Blob/File хранятся как ArrayBuffer для полной совместимости со всеми браузерами (включая Safari).
 */
type DBCacheItem = Omit<MediaCacheItem, "blob" | "thumbnail"> & {
    blob: ArrayBuffer | null;
    thumbnail: ArrayBuffer | null;
};

/**
 * Пул экземпляров БД для избежания повторных инициализаций
 */
const dbInstances: Record<string, Dexie & { media_cache: Table<DBCacheItem> }> =
    {};

/**
 * Возвращает префикс для базы данных на основе URL PocketBase для разделения сред Dev/Prod
 */
const getDbPrefix = (): string => {
    try {
        const url = new URL(env.VITE_PB_URL);
        return url.host.replace(/[^a-zA-Z0-9]/g, "_");
    } catch {
        return "default";
    }
};

/**
 * Фабрика для создания/получения инстанса БД конкретного пользователя.
 */
export const getMediaDB = (userId: string) => {
    if (!userId) {
        throw new Error("userId обязателен для инициализации MediaDB");
    }

    const dbKey = `${getDbPrefix()}_${userId}`;

    if (!dbInstances[dbKey]) {
        const db = new Dexie(`KnockKnock_Media_${dbKey}`) as Dexie & {
            media_cache: Table<DBCacheItem>;
        };

        db.version(1).stores({
            // id - первичный ключ
            // *references.id - мульти-индекс для поиска по ID связей (messageId/roomId)
            // roomId - индекс для поиска всех медиа комнаты (в т.ч. эфемерных)
            media_cache: `${MEDIA_CACHE_FIELDS.ID}, *${MEDIA_CACHE_FIELDS.REFERENCES}.id, ${MEDIA_CACHE_FIELDS.ROOM_ID}, ${MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT}, ${MEDIA_CACHE_FIELDS.SYNC_STATUS}`,
        });

        dbInstances[dbKey] = db;
    }

    return dbInstances[dbKey];
};

/**
 * Восстанавливает Blob объекты из ArrayBuffer для совместимости со всеми браузерами.
 */
const restoreBlobs = (
    item: DBCacheItem | undefined,
): MediaCacheItem | undefined => {
    if (!item) {
        return undefined;
    }

    const restoredBlob = item.blob
        ? new Blob([item.blob], {
              type: item.metadata.mimeType || "application/octet-stream",
          })
        : null;

    const restoredThumb = item.thumbnail
        ? new Blob([item.thumbnail], {
              type: "image/webp",
          })
        : null;

    return {
        ...item,
        blob: restoredBlob,
        thumbnail: restoredThumb,
    };
};

/**
 * Конвертирует Blob/File в ArrayBuffer перед сохранением в IndexedDB
 * для обхода багов сериализации WebKit (Safari).
 */
const prepareItemForStorage = async (
    item: MediaCacheItem,
): Promise<DBCacheItem> => {
    const rawBlob =
        item.blob instanceof Blob ? await item.blob.arrayBuffer() : null;

    const rawThumb =
        item.thumbnail instanceof Blob
            ? await item.thumbnail.arrayBuffer()
            : null;

    return {
        ...item,
        blob: rawBlob,
        thumbnail: rawThumb,
    };
};

/**
 * Подготавливает частичные изменения (changes) для метода update.
 */
const prepareChangesForStorage = async (
    changes: Partial<MediaCacheItem>,
): Promise<Partial<DBCacheItem>> => {
    const prepared: Partial<DBCacheItem> = {
        ...changes,
    } as unknown as Partial<DBCacheItem>;

    if (changes.blob instanceof Blob) {
        prepared.blob = await changes.blob.arrayBuffer();
    }

    if (changes.thumbnail instanceof Blob) {
        prepared.thumbnail = await changes.thumbnail.arrayBuffer();
    }

    return prepared;
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
                return restoreBlobs(updatedItem);
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
        const prepared = await prepareItemForStorage(item);
        return db.media_cache.put(prepared);
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
        const preparedChanges = await prepareChangesForStorage(changes);
        return db.transaction("rw", db.media_cache, async () => {
            const item = await db.media_cache.get(id);
            if (item) {
                await db.media_cache.put({
                    ...item,
                    ...preparedChanges,
                    [MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT]: Date.now(),
                });
            }
        });
    },

    /**
     * Возвращает суммарный размер кэша в байтах для конкретного пользователя.
     * Суммирует размер ArrayBuffer основного файла и превью.
     */
    getCacheSize: async (userId: string): Promise<number> => {
        const db = getMediaDB(userId);
        let totalSize = 0;
        await db.media_cache.each((item) => {
            const blob = item[MEDIA_CACHE_FIELDS.BLOB];
            if (blob) {
                totalSize += blob.byteLength;
            }
            const thumbnail = item[MEDIA_CACHE_FIELDS.THUMBNAIL];
            if (thumbnail) {
                totalSize += thumbnail.byteLength;
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

    /**
     * Очищает старые медиа-записи из кэша по TTL, исключая избранные и аватары комнат.
     */
    cleanupExpiredCache: async ({
        userId,
        ttlMs,
    }: {
        userId: string;
        ttlMs: number;
    }): Promise<void> => {
        const db = getMediaDB(userId);
        const threshold = Date.now() - ttlMs;

        return db.transaction("rw", db.media_cache, async () => {
            // Находим кандидаты на удаление (по последнему доступу)
            const candidates = await db.media_cache
                .where(MEDIA_CACHE_FIELDS.LAST_ACCESSED_AT)
                .below(threshold)
                .toArray();

            const toDelete: string[] = [];

            for (const item of candidates) {
                // Проверяем, есть ли ссылки на избранное или аватарку комнаты
                const hasProtectedRef = item.references.some(
                    (ref) =>
                        ref.type === MEDIA_REFERENCE_TYPES.FAVORITE ||
                        ref.type === MEDIA_REFERENCE_TYPES.ROOM_AVATAR,
                );

                if (!hasProtectedRef) {
                    toDelete.push(item[MEDIA_CACHE_FIELDS.ID]);
                }
            }

            if (toDelete.length > 0) {
                await db.media_cache.bulkDelete(toDelete);
            }
        });
    },

    /**
     * Очищает кэш медиафайлов пользователя, сохраняя избранные медиа и аватары комнат.
     */
    clearUnusedCache: async (userId: string): Promise<void> => {
        const db = getMediaDB(userId);
        return db.transaction("rw", db.media_cache, async () => {
            const candidates = await db.media_cache.toArray();
            const toDelete: string[] = [];

            for (const item of candidates) {
                const hasProtectedRef = item.references.some(
                    (ref) =>
                        ref.type === MEDIA_REFERENCE_TYPES.FAVORITE ||
                        ref.type === MEDIA_REFERENCE_TYPES.ROOM_AVATAR,
                );

                if (!hasProtectedRef) {
                    toDelete.push(item[MEDIA_CACHE_FIELDS.ID]);
                }
            }

            if (toDelete.length > 0) {
                await db.media_cache.bulkDelete(toDelete);
            }
        });
    },
};
