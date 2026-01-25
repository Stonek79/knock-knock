/**
 * Модуль шифрования (Key Wrapping).
 * Реализует ECIES (Elliptic Curve Integrated Encryption Scheme)
 * для безопасной передачи симметричных ключей (Room Keys) между пользователями
 * через их публичные ключи X25519.
 */

const subtle = window.crypto.subtle;

/**
 * Шифрует (заворачивает) симметричный ключ комнаты для получателя.
 *
 * Алгоритм (Гибридное шифрование):
 * 1. Генерируем эфемерную пару ключей X25519 (Ephemeral Key Pair).
 * 2. Делаем ECDH с публичным ключом получателя -> получаем общий секрет (Shared Secret).
 * 3. Из общего секрета деривируем ключ шифрования (KEK - Key Encryption Key) через HKDF.
 * 4. Шифруем целевой ключ (Room Key) с помощью KEK (AES-GCM).
 * 5. Возвращаем структуру: { ephemeralPublicKey, iv, ciphertext }.
 */
export async function wrapRoomKey(
    roomKey: CryptoKey,
    recipientPublicKey: CryptoKey, // X25519 Public Key
): Promise<{
    ephemeralPublicKey: ArrayBuffer;
    iv: ArrayBuffer;
    ciphertext: ArrayBuffer;
}> {
    // 1. Эфемерная пара
    const ephemeralKeyPair = (await subtle.generateKey(
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true,
        ['deriveKey', 'deriveBits'],
    )) as CryptoKeyPair;

    // 2. ECDH Shared Secret -> 3. Derive KEK (AES-GCM 256)
    // В Web Crypto API derivedKey делается за один шаг через deriveKey
    const kek = await subtle.deriveKey(
        {
            name: 'ECDH',
            public: recipientPublicKey,
        },
        ephemeralKeyPair.privateKey,
        {
            name: 'AES-GCM',
            length: 256,
        },
        false, // KEK не нужно извлекать
        ['encrypt'],
    );

    // 4. Шифруем Room Key (сначала экспортируем его в raw bytes)
    const roomKeyBytes = await subtle.exportKey('raw', roomKey);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
        kek,
        roomKeyBytes,
    );

    // 5. Возвращаем
    return {
        ephemeralPublicKey: await subtle.exportKey(
            'raw',
            ephemeralKeyPair.publicKey,
        ),
        iv: iv.buffer,
        ciphertext: ciphertext,
    };
}

/**
 * Расшифровывает (разворачивает) ключ комнаты.
 *
 * Алгоритм:
 * 1. Импортируем публичный эфемерный ключ отправителя.
 * 2. Делаем ECDH с нашим приватным ключом -> получаем тот же общий секрет.
 * 3. Деривируем тот же KEK.
 * 4. Расшифровываем ciphertext -> получаем байты Room Key.
 * 5. Импортируем Room Key обратно в CryptoKey.
 */
export async function unwrapRoomKey(
    encryptedData: {
        ephemeralPublicKey: ArrayBuffer;
        iv: ArrayBuffer;
        ciphertext: ArrayBuffer;
    },
    myPrivateKey: CryptoKey, // My X25519 Private Key
): Promise<CryptoKey> {
    // 1. Import Ephemeral Public Key
    const ephemeralPub = await subtle.importKey(
        'raw',
        encryptedData.ephemeralPublicKey,
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        false,
        [],
    );

    // 2 & 3. ECDH -> Derive KEK
    const kek = await subtle.deriveKey(
        {
            name: 'ECDH',
            public: ephemeralPub,
        },
        myPrivateKey,
        {
            name: 'AES-GCM',
            length: 256,
        },
        false,
        ['decrypt'],
    );

    // 4. Decrypt Room Key Bytes
    const roomKeyBytes = await subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: encryptedData.iv,
        },
        kek,
        encryptedData.ciphertext,
    );

    // 5. Import Room Key
    return await subtle.importKey(
        'raw',
        roomKeyBytes,
        { name: 'AES-GCM' },
        true, // Room Key usually extractable to reuse/export? Let's say yes for now.
        ['encrypt', 'decrypt'],
    );
}
