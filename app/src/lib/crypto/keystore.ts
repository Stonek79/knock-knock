/**
 * Модуль для хранения криптографических ключей в IndexedDB.
 * Сохраняет нативные объекты CryptoKey.
 */
import { type IDBPDatabase, openDB } from "idb";

const DB_NAME = "knock-knock-keystore";
const DB_VERSION = 2; // Увеличили версию (миграция схемы)
const STORE_NAME = "keys";

export type KeyType = "identity" | "prekey";

/** Структура хранимой пары ключей */
export interface StoredKeyPair {
    id: KeyType;
    /** Нативный CryptoKey (приватный) */
    privateKey: CryptoKey;
    /** Нативный CryptoKey (публичный) */
    publicKey: CryptoKey;
    createdAt: Date;
}

interface KeystoreDB {
    keys: {
        key: KeyType;
        value: StoredKeyPair;
    };
}

let dbInstance: IDBPDatabase<KeystoreDB> | null = null;

export async function openKeystore(): Promise<IDBPDatabase<KeystoreDB>> {
    if (dbInstance) {
        return dbInstance;
    }

    dbInstance = await openDB<KeystoreDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            if (oldVersion < 1) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
            // Если была версия 1 (с Uint8Array), лучше очистить стор при миграции на v2,
            // так как формат данных кардинально меняется.
            // В продакшене нужна была бы миграция (импорт байтов -> CryptoKey),
            // но на этапе dev можно сбросить.
            if (oldVersion === 1) {
                db.deleteObjectStore(STORE_NAME);
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        },
    });

    return dbInstance;
}

export async function saveKeyPair(
    type: KeyType,
    privateKey: CryptoKey,
    publicKey: CryptoKey,
): Promise<void> {
    const db = await openKeystore();
    const keyPair: StoredKeyPair = {
        id: type,
        privateKey,
        publicKey,
        createdAt: new Date(),
    };
    await db.put(STORE_NAME, keyPair);
}

export async function getKeyPair(
    type: KeyType,
): Promise<StoredKeyPair | undefined> {
    const db = await openKeystore();
    return db.get(STORE_NAME, type);
}

export async function deleteKeyPair(type: KeyType): Promise<void> {
    const db = await openKeystore();
    await db.delete(STORE_NAME, type);
}

export async function clearAllKeys(): Promise<void> {
    const db = await openKeystore();
    await db.clear(STORE_NAME);
}

export async function hasKeys(): Promise<boolean> {
    const identity = await getKeyPair("identity");
    const prekey = await getKeyPair("prekey");
    return !!identity && !!prekey;
}
