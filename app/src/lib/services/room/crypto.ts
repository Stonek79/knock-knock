import { ERROR_CODES, MEMBER_ROLE } from "@/lib/constants";
import { wrapRoomKey } from "@/lib/crypto/encryption";
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/lib/crypto/keys";
import { logger } from "@/lib/logger";
import type {
    Result,
    RoomError,
    RoomKeysRecord,
    RoomMembersRecord,
} from "@/lib/types";
import { appError, err, ok } from "@/lib/utils/result";

/**
 * Шифрует симметричный ключ комнаты AES-GCM для каждого участника с использованием их публичного ECDH ключа.
 * Также формирует массив участников для добавления в БД.
 */
export async function encryptRoomKeysForMembers(
    profiles: { id: string; public_key_x25519: string }[],
    roomKey: CryptoKey,
    roomId: string,
    myUserId: string,
): Promise<
    Result<
        {
            encryptedKeys: RoomKeysRecord[];
            roomMembers: RoomMembersRecord[];
        },
        RoomError
    >
> {
    const encryptedKeys: RoomKeysRecord[] = [];
    const roomMembers: RoomMembersRecord[] = [];

    for (const profile of profiles) {
        if (!profile.public_key_x25519) {
            logger.warn(`У пользователя ${profile.id} нет публичного ключа`);
            return err(
                appError(
                    ERROR_CODES.MISSING_KEYS,
                    `У пользователя ${profile.id} нет публичного ключа`,
                    {
                        userIds: [profile.id],
                    },
                ),
            );
        }

        try {
            const keyBuffer = base64ToArrayBuffer(profile.public_key_x25519);
            const byteLength = keyBuffer.byteLength;

            logger.debug(
                `Импорт ключа для пользователя ${profile.id}, длина байтов: ${byteLength}`,
            );

            let recipientPubKey: CryptoKey;

            // Дифференцированный импорт в зависимости от длины байтов
            if (byteLength === 32) {
                // Скорее всего это X25519
                try {
                    recipientPubKey = await window.crypto.subtle.importKey(
                        "raw",
                        keyBuffer,
                        "X25519",
                        true,
                        [],
                    );
                } catch (e) {
                    logger.error(
                        `Браузер не поддерживает X25519 для пользователя ${profile.id}`,
                        e,
                    );
                    throw e;
                }
            } else {
                // Ожидаем P-256 (65 байт uncompressed или 33 байта compressed)
                recipientPubKey = await window.crypto.subtle.importKey(
                    "raw",
                    keyBuffer,
                    {
                        name: "ECDH",
                        namedCurve: "P-256",
                    },
                    true,
                    [],
                );
            }

            const wrapped = await wrapRoomKey(roomKey, recipientPubKey);

            const serializedKey = JSON.stringify({
                ephemeralPublicKey: arrayBufferToBase64(
                    wrapped.ephemeralPublicKey,
                ),
                iv: arrayBufferToBase64(wrapped.iv),
                ciphertext: arrayBufferToBase64(wrapped.ciphertext),
            });

            encryptedKeys.push({
                room: roomId,
                user: profile.id,
                encrypted_key: serializedKey,
            });

            roomMembers.push({
                room: roomId,
                user: profile.id,
                unread_count: 0,
                role:
                    profile.id === myUserId
                        ? MEMBER_ROLE.OWNER
                        : MEMBER_ROLE.MEMBER,
            });
        } catch (e) {
            logger.error("Ошибка шифрования ключа комнаты", e);
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    "Ошибка шифрования ключа комнаты",
                    e instanceof Error ? e : undefined,
                ),
            );
        }
    }

    return ok({ encryptedKeys, roomMembers });
}
