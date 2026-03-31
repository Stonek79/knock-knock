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
    recipientPublicKey: CryptoKey,
): Promise<{
    ephemeralPublicKey: ArrayBuffer;
    iv: ArrayBuffer;
    ciphertext: ArrayBuffer;
}> {
    // Определяем параметры алгоритма на основе ключа получателя
    const isX25519 = recipientPublicKey.algorithm.name === "X25519";
    const namedCurve =
        (recipientPublicKey.algorithm as EcKeyAlgorithm).namedCurve || "P-256";
    const genAlgorithm = isX25519
        ? { name: "X25519" }
        : { name: "ECDH", namedCurve };

    const deriveAlgorithm = isX25519
        ? { name: "X25519", public: recipientPublicKey }
        : { name: "ECDH", public: recipientPublicKey };

    // 1. Генерируем эфемерную пару ключей того же типа
    const ephemeralKeyPair = (await subtle.generateKey(genAlgorithm, true, [
        "deriveKey",
        "deriveBits",
    ])) as CryptoKeyPair;

    // 2. ECDH Shared Secret -> 3. Derive KEK (AES-GCM 256)
    const kek = await subtle.deriveKey(
        deriveAlgorithm,
        ephemeralKeyPair.privateKey,
        {
            name: "AES-GCM",
            length: 256,
        },
        false,
        ["encrypt"],
    );

    // 4. Шифруем Room Key
    const roomKeyBytes = await subtle.exportKey("raw", roomKey);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        kek,
        roomKeyBytes,
    );

    // 5. Возвращаем
    return {
        ephemeralPublicKey: await subtle.exportKey(
            "raw",
            ephemeralKeyPair.publicKey,
        ),
        iv: iv.buffer,
        ciphertext: ciphertext,
    };
}

/**
 * Расшифровывает (разворачивает) ключ комнаты.
 */
export async function unwrapRoomKey(
    encryptedData: {
        ephemeralPublicKey: ArrayBuffer;
        iv: ArrayBuffer;
        ciphertext: ArrayBuffer;
    },
    myPrivateKey: CryptoKey,
): Promise<CryptoKey> {
    // Определяем параметры алгоритма на основе нашего приватного ключа
    const isX25519 = myPrivateKey.algorithm.name === "X25519";
    const importAlgorithm = isX25519
        ? { name: "X25519" }
        : {
              name: "ECDH",
              namedCurve:
                  (myPrivateKey.algorithm as EcKeyAlgorithm).namedCurve ||
                  "P-256",
          };

    const deriveAlgorithm = isX25519
        ? { name: "X25519" } // Публичный ключ добавится ниже
        : { name: "ECDH" };

    // 1. Import Ephemeral Public Key
    const ephemeralPub = await subtle.importKey(
        "raw",
        encryptedData.ephemeralPublicKey,
        importAlgorithm,
        false,
        [],
    );

    // 2 & 3. ECDH -> Derive KEK
    const kek = await subtle.deriveKey(
        {
            ...deriveAlgorithm,
            public: ephemeralPub,
        } as EcdhKeyDeriveParams,
        myPrivateKey,
        {
            name: "AES-GCM",
            length: 256,
        },
        false,
        ["decrypt"],
    );

    // 4. Decrypt Room Key Bytes
    const roomKeyBytes = await subtle.decrypt(
        {
            name: "AES-GCM",
            iv: encryptedData.iv,
        },
        kek,
        encryptedData.ciphertext,
    );

    // 5. Import Room Key
    return await subtle.importKey(
        "raw",
        roomKeyBytes,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"],
    );
}
