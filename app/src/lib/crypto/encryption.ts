/**
 * Модуль шифрования (Key Wrapping).
 * Реализует ECIES (Elliptic Curve Integrated Encryption Scheme)
 * для безопасной передачи симметричных ключей (Room Keys) между пользователями
 * через их публичные ключи X25519.
 */

import { CRYPTO_CONFIG } from "../constants";
import { cryptoProvider, subtleProvider } from "./provider";

const subtle = subtleProvider;

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
    const isX25519 =
        recipientPublicKey.algorithm.name === CRYPTO_CONFIG.ALGORITHM.X25519;
    const namedCurve =
        (recipientPublicKey.algorithm as EcKeyAlgorithm).namedCurve ||
        CRYPTO_CONFIG.CURVE.P_256;
    const genAlgorithm = isX25519
        ? { name: CRYPTO_CONFIG.ALGORITHM.X25519 }
        : { name: CRYPTO_CONFIG.ALGORITHM.ECDH, namedCurve };

    const deriveAlgorithm = isX25519
        ? { name: CRYPTO_CONFIG.ALGORITHM.X25519, public: recipientPublicKey }
        : { name: CRYPTO_CONFIG.ALGORITHM.ECDH, public: recipientPublicKey };

    // 1. Генерируем эфемерную пару ключей того же типа
    const ephemeralKeyPair = (await subtle.generateKey(
        genAlgorithm,
        true,
        CRYPTO_CONFIG.USAGE.DERIVE,
    )) as CryptoKeyPair;

    // 2. ECDH Shared Secret -> 3. Derive KEK (AES-GCM 256)
    const kek = await subtle.deriveKey(
        deriveAlgorithm,
        ephemeralKeyPair.privateKey,
        {
            name: CRYPTO_CONFIG.ALGORITHM.AES_GCM,
            length: CRYPTO_CONFIG.AES_KEY_LENGTH_BITS,
        },
        false,
        [CRYPTO_CONFIG.USAGE.ENCRYPT],
    );

    // 4. Шифруем Room Key
    const roomKeyBytes = await subtle.exportKey(
        CRYPTO_CONFIG.FORMAT.RAW,
        roomKey,
    );
    const iv = cryptoProvider.getRandomValues(
        new Uint8Array(CRYPTO_CONFIG.IV_LENGTH_BYTES),
    );

    const ciphertext = await subtle.encrypt(
        {
            name: CRYPTO_CONFIG.ALGORITHM.AES_GCM,
            iv: iv,
        },
        kek,
        roomKeyBytes,
    );

    // 5. Возвращаем
    return {
        ephemeralPublicKey: await subtle.exportKey(
            CRYPTO_CONFIG.FORMAT.RAW,
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
    const isX25519 =
        myPrivateKey.algorithm.name === CRYPTO_CONFIG.ALGORITHM.X25519;
    const importAlgorithm = isX25519
        ? { name: CRYPTO_CONFIG.ALGORITHM.X25519 }
        : {
              name: CRYPTO_CONFIG.ALGORITHM.ECDH,
              namedCurve:
                  (myPrivateKey.algorithm as EcKeyAlgorithm).namedCurve ||
                  CRYPTO_CONFIG.CURVE.P_256,
          };

    const deriveAlgorithm = isX25519
        ? { name: CRYPTO_CONFIG.ALGORITHM.X25519 } // Публичный ключ добавится ниже
        : { name: CRYPTO_CONFIG.ALGORITHM.ECDH };

    // 1. Import Ephemeral Public Key
    const ephemeralPub = await subtle.importKey(
        CRYPTO_CONFIG.FORMAT.RAW,
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
            name: CRYPTO_CONFIG.ALGORITHM.AES_GCM,
            length: CRYPTO_CONFIG.AES_KEY_LENGTH_BITS,
        },
        false,
        [CRYPTO_CONFIG.USAGE.DECRYPT],
    );

    // 4. Decrypt Room Key Bytes
    const roomKeyBytes = await subtle.decrypt(
        {
            name: CRYPTO_CONFIG.ALGORITHM.AES_GCM,
            iv: encryptedData.iv,
        },
        kek,
        encryptedData.ciphertext,
    );

    // 5. Import Room Key
    return await subtle.importKey(
        CRYPTO_CONFIG.FORMAT.RAW,
        roomKeyBytes,
        { name: CRYPTO_CONFIG.ALGORITHM.AES_GCM },
        true,
        CRYPTO_CONFIG.USAGE.ENCRYPT_DECRYPT,
    );
}
