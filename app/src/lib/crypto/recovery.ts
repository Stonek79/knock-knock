/**
 * Модуль восстановления и резервного копирования ключей.
 * Использует PBKDF2 для деривации ключа шифрования из пароля
 * и AES-GCM для защиты данных.
 */

const subtle = window.crypto.subtle;

/** Формат файла бэкапа */
export interface KeyBackup {
    version: number;
    salt: string; // Base64
    iv: string; // Base64
    data: string; // Base64 (encrypted JSON with JWKs)
}

/** Внутренняя структура данных для шифрования */
interface BackupPayload {
    identity: {
        private: JsonWebKey;
        public: JsonWebKey;
    };
    prekey: {
        private: JsonWebKey;
        public: JsonWebKey;
    };
}

// Утилиты преобразования (дублируем, чтобы не зависеть от keys.ts циклически, или вынесем в utils.ts позже)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Генерирует ключ шифрования из пароля.
 */
async function getKeyFromPassword(
    password: string,
    salt: Uint8Array,
): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey'],
    );

    return await subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as BufferSource,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/**
 * Создает зашифрованный бэкап ключей.
 */
export async function createBackup(
    password: string,
    identityPair: { privateKey: CryptoKey; publicKey: CryptoKey },
    preKeyPair: { privateKey: CryptoKey; publicKey: CryptoKey },
): Promise<KeyBackup> {
    // 1. Экспортируем ключи в JWK
    const payload: BackupPayload = {
        identity: {
            private: await subtle.exportKey('jwk', identityPair.privateKey),
            public: await subtle.exportKey('jwk', identityPair.publicKey),
        },
        prekey: {
            private: await subtle.exportKey('jwk', preKeyPair.privateKey),
            public: await subtle.exportKey('jwk', preKeyPair.publicKey),
        },
    };

    // 2. Готовим данные
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 3. Шифруем
    const key = await getKeyFromPassword(password, salt);
    const ciphertext = await subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
        key,
        plaintext,
    );

    // 4. Формируем результат
    return {
        version: 1,
        salt: arrayBufferToBase64(salt.buffer),
        iv: arrayBufferToBase64(iv.buffer),
        data: arrayBufferToBase64(ciphertext),
    };
}

/**
 * Быстрый тип для возврата восстановленных ключей
 * (CryptoKey, но без структуры KeyPair, так как импорт возвращает CryptoKey)
 */
export interface RestoredKeys {
    identity: { privateKey: CryptoKey; publicKey: CryptoKey };
    prekey: { privateKey: CryptoKey; publicKey: CryptoKey };
}

/**
 * Восстанавливает ключи из бэкапа.
 */
export async function restoreBackup(
    backup: KeyBackup,
    password: string,
): Promise<RestoredKeys> {
    if (backup.version !== 1) {
        throw new Error('Unsupported backup version');
    }

    try {
        const salt = new Uint8Array(base64ToArrayBuffer(backup.salt));
        const iv = new Uint8Array(base64ToArrayBuffer(backup.iv));
        const ciphertext = base64ToArrayBuffer(backup.data);

        // 1. Деривация ключа
        const key = await getKeyFromPassword(password, salt);

        // 2. Расшифровка
        const plaintextBuffer = await subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            key,
            ciphertext,
        );

        // 3. Парсинг JSON
        const plaintext = new TextDecoder().decode(plaintextBuffer);
        const payload: BackupPayload = JSON.parse(plaintext);

        // 4. Импорт ключей (JWK -> CryptoKey)
        const identityPrivate = await subtle.importKey(
            'jwk',
            payload.identity.private,
            { name: 'Ed25519' },
            true,
            ['sign'],
        );
        const identityPublic = await subtle.importKey(
            'jwk',
            payload.identity.public,
            { name: 'Ed25519' },
            true,
            ['verify'],
        );

        const prekeyPrivate = await subtle.importKey(
            'jwk',
            payload.prekey.private,
            { name: 'X25519' },
            true,
            ['deriveKey', 'deriveBits'],
        );
        const prekeyPublic = await subtle.importKey(
            'jwk',
            payload.prekey.public,
            { name: 'X25519' },
            true, // Часто публичные ключи тоже нужны extractable для передачи
            [], // У X25519 public key usage часто пустой при импорте, или не проверяется так строго?
            // Обычно для X25519 public key usages не задаются при deriveBits?
            // Спецификация: Public keys for X25519 do not support any usages directly?
            // Нет, для deriveBits нужен PUBLIC key собеседника, но usages задаются при импорте?
            // Обычно [] или ['deriveBits'] (но deriveBits - это usage приватного ключа).
            // Проверим спецификацию: "The 'deriveKey' and 'deriveBits' usages are only applicable to private keys."
            // Значит для публичного ключа usage должен быть []?
            // На всякий случай оставим пустым, так как он используется как параметр в deriveBits.
        );

        return {
            identity: {
                privateKey: identityPrivate,
                publicKey: identityPublic,
            },
            prekey: { privateKey: prekeyPrivate, publicKey: prekeyPublic },
        };
    } catch (e) {
        console.error(e);
        throw new Error('Failed to decrypt backup. Wrong password?');
    }
}
