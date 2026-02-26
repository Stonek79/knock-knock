import { ERROR_CODES, MEMBER_ROLE } from "@/lib/constants";
import { wrapRoomKey } from "@/lib/crypto/encryption";
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/lib/crypto/keys";
import { logger } from "@/lib/logger";
import type { Result, RoomError, RoomKey, RoomMember } from "@/lib/types";
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
            encryptedKeys: Omit<RoomKey, "created_at">[];
            roomMembers: Omit<RoomMember, "joined_at">[];
        },
        RoomError
    >
> {
    const encryptedKeys: Omit<RoomKey, "created_at">[] = [];
    const roomMembers: Omit<RoomMember, "joined_at">[] = [];

    for (const profile of profiles) {
        // Режим Mock: пропускаем реальное шифрование
        if (import.meta.env.VITE_USE_MOCK === "true") {
            roomMembers.push({
                room_id: roomId,
                user_id: profile.id,
                role:
                    profile.id === myUserId
                        ? MEMBER_ROLE.ADMIN
                        : MEMBER_ROLE.MEMBER,
            });
            encryptedKeys.push({
                room_id: roomId,
                user_id: profile.id,
                encrypted_key: JSON.stringify({
                    iv: "mock",
                    ciphertext: "mock",
                    ephemeralPublicKey: "mock",
                }),
            });
            continue;
        }

        if (!profile.public_key_x25519) {
            logger.warn(`User ${profile.id} has no keys`);
            return err(
                appError(
                    ERROR_CODES.MISSING_KEYS,
                    `User ${profile.id} has no keys`,
                    {
                        userIds: [profile.id],
                    },
                ),
            );
        }

        try {
            const recipientPubKey = await window.crypto.subtle.importKey(
                "raw",
                base64ToArrayBuffer(profile.public_key_x25519),
                {
                    name: "ECDH",
                    namedCurve: "P-256",
                },
                true,
                [],
            );

            const wrapped = await wrapRoomKey(roomKey, recipientPubKey);

            const serializedKey = JSON.stringify({
                ephemeralPublicKey: arrayBufferToBase64(
                    wrapped.ephemeralPublicKey,
                ),
                iv: arrayBufferToBase64(wrapped.iv),
                ciphertext: arrayBufferToBase64(wrapped.ciphertext),
            });

            encryptedKeys.push({
                room_id: roomId,
                user_id: profile.id,
                encrypted_key: serializedKey,
            });

            roomMembers.push({
                room_id: roomId,
                user_id: profile.id,
                role:
                    profile.id === myUserId
                        ? MEMBER_ROLE.ADMIN
                        : MEMBER_ROLE.MEMBER,
            });
        } catch (e) {
            logger.error("Crypto error during createRoom", e);
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    "Failed to encrypt room key",
                    e instanceof Error ? e : undefined,
                ),
            );
        }
    }

    return ok({ encryptedKeys, roomMembers });
}
