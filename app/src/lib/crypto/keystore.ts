/**
 * Модуль для хранения криптографических ключей в IndexedDB.
 * Сохраняет нативные объекты CryptoKey.
 * Использует Dexie (как и media-db.ts) для единообразия подхода к IndexedDB в проекте.
 */

import Dexie, { type Table } from "dexie";
import { KEYSTORE_CONFIG, KEYSTORE_TYPES } from "../constants";
import type { KeyType } from "../types";

/** Структура хранимой пары ключей */
export interface StoredKeyPair {
    id: KeyType;
    /** Нативный CryptoKey (приватный) */
    privateKey: CryptoKey;
    /** Нативный CryptoKey (публичный) */
    publicKey: CryptoKey;
    createdAt: Date;
}

/**
 * Схема Dexie-базы для keystore.
 * Хранит пары ключей с индексом по id.
 */
class KeystoreDatabase extends Dexie {
    keys!: Table<StoredKeyPair, KeyType>;

    constructor() {
        super(KEYSTORE_CONFIG.DB_NAME);
        this.version(1).stores({
            // id — primaryKey (тип ключа: identity | prekey)
            [KEYSTORE_CONFIG.TABLES.KEYS]: "id",
        });

        this.keys = this.table(KEYSTORE_CONFIG.TABLES.KEYS);
    }
}

/** Синглтон инстанса базы */
let dbInstance: KeystoreDatabase | null = null;

/**
 * Возвращает синглтон БД keystore.
 * При первом вызове открывает/создает базу данных.
 */
export function openKeystore(): KeystoreDatabase {
    if (!dbInstance) {
        dbInstance = new KeystoreDatabase();
    }
    return dbInstance;
}

/**
 * Сохраняет или обновляет пару ключей в IndexedDB.
 */
export async function saveKeyPair(
    type: KeyType,
    privateKey: CryptoKey,
    publicKey: CryptoKey,
): Promise<void> {
    const db = openKeystore();
    const keyPair: StoredKeyPair = {
        id: type,
        privateKey,
        publicKey,
        createdAt: new Date(),
    };
    await db.keys.put(keyPair);
}

/**
 * Возвращает пару ключей по типу.
 * Возвращает undefined если ключ не найден.
 */
export async function getKeyPair(
    type: KeyType,
): Promise<StoredKeyPair | undefined> {
    const db = openKeystore();
    return db.keys.get(type);
}

/**
 * Удаляет пару ключей по типу.
 */
export async function deleteKeyPair(type: KeyType): Promise<void> {
    const db = openKeystore();
    await db.keys.delete(type);
}

/**
 * Очищает все ключи из хранилища.
 */
export async function clearAllKeys(): Promise<void> {
    const db = openKeystore();
    await db.keys.clear();
}

/**
 * Проверяет наличие обоих ключей (identity и prekey).
 */
export async function hasKeys(): Promise<boolean> {
    const identity = await getKeyPair(KEYSTORE_TYPES.IDENTITY);
    const prekey = await getKeyPair(KEYSTORE_TYPES.PREKEY);
    return !!identity && !!prekey;
}
