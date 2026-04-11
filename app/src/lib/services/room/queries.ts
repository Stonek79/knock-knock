import {
    DB_TABLES,
    ERROR_CODES,
    KEYSTORE_TYPES,
    ROOM_FIELDS,
    ROOM_TYPE,
} from "@/lib/constants";
import { unwrapRoomKey } from "@/lib/crypto/encryption";
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    exportPublicKey,
} from "@/lib/crypto/keys";
import { getKeyPair } from "@/lib/crypto/keystore";
import {
    generateDeterministicRoomId,
    generateDeterministicRoomKey,
    generateRoomKey,
} from "@/lib/crypto/rooms";
import { logger } from "@/lib/logger";
import { messageRepository } from "@/lib/repositories/message.repository";
import { roomRepository } from "@/lib/repositories/room.repository";
import type {
    AppError,
    Result,
    RoomDataWithKey,
    RoomError,
    RoomRepoError,
    RoomWithMembers,
    UnreadCount,
} from "@/lib/types";
import { DEFAULT_DATE } from "@/lib/utils/date";
import { appError, err, ok } from "@/lib/utils/result";
import { encryptRoomKeysForMembers } from "./crypto";
import { createRoom } from "./mutations";

/**
 * Self-key provisioning: Генерирует и сохраняет ключ комнаты для self-chat (Избранное).
 *
 * Серверный хук PocketBase создаёт комнату и room_members при регистрации,
 * но НЕ может создать room_keys, т.к. не имеет доступа к криптоключам пользователя.
 * Эта функция решает проблему: при первом входе клиент сам генерирует AES-256-GCM ключ,
 * шифрует его через ECDH для самого себя и сохраняет в room_keys.
 *
 * @param roomId - ID комнаты «Избранное»
 * @param userId - ID текущего пользователя
 * @returns CryptoKey - расшифрованный ключ комнаты
 */
async function provisionSelfChatKey(
    roomId: string,
    userId: string,
): Promise<Result<CryptoKey, AppError<string>>> {
    try {
        // 1. Генерируем новый AES-256-GCM ключ комнаты
        const roomKey = await generateRoomKey();

        // 2. Получаем свои Identity и Prekey для ECDH wrap
        const prekey = await getKeyPair(KEYSTORE_TYPES.PREKEY);
        if (!prekey) {
            return err(
                appError(
                    ERROR_CODES.MISSING_KEYS,
                    "Prekey не инициализирован. Невозможно создать ключ комнаты.",
                ),
            );
        }

        // 3. Экспортируем публичный ключ в Base64 для encryptRoomKeysForMembers
        const pubKeyBase64 = arrayBufferToBase64(
            await exportPublicKey(prekey.publicKey),
        );

        // 4. Шифруем ключ комнаты через стандартный ECDH flow (для единственного участника — себя)
        const cryptoResult = await encryptRoomKeysForMembers(
            [{ id: userId, public_key_x25519: pubKeyBase64 }],
            roomKey,
            roomId,
            userId,
        );

        if (cryptoResult.isErr()) {
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    "Self-key provisioning: ошибка шифрования ключа комнаты",
                    cryptoResult.error,
                ),
            );
        }

        const encryptedKeyRecord = cryptoResult.value.encryptedKeys[0];
        if (!encryptedKeyRecord) {
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    "Self-key provisioning: пустой результат шифрования",
                ),
            );
        }

        // 5. Сохраняем в room_keys (с обработкой race condition — две вкладки одновременно)
        const saveResult = await roomRepository.createRoomKey({
            room: encryptedKeyRecord.room,
            user: encryptedKeyRecord.user,
            encrypted_key: encryptedKeyRecord.encrypted_key,
        });

        if (saveResult.isErr()) {
            // Race condition: другая вкладка уже создала ключ — пытаемся получить существующий
            logger.warn(
                "Self-key provisioning: createRoomKey conflict, пытаемся получить существующий ключ",
            );
            const retryResult = await roomRepository.getRoomKey(roomId, userId);
            if (retryResult.isErr()) {
                return err(
                    appError(
                        ERROR_CODES.DB_ERROR,
                        "Self-key provisioning: не удалось ни создать, ни получить ключ комнаты",
                        retryResult.error,
                    ),
                );
            }

            // Расшифровываем существующий ключ (созданный другой вкладкой)
            const identity = await getKeyPair(KEYSTORE_TYPES.IDENTITY);
            if (!identity) {
                return err(
                    appError(
                        ERROR_CODES.MISSING_KEYS,
                        "Identity не инициализирован при fallback-расшифровке",
                    ),
                );
            }

            const encryptedData = JSON.parse(retryResult.value.encrypted_key);
            const existingRoomKey = await unwrapRoomKey(
                {
                    ephemeralPublicKey: base64ToArrayBuffer(
                        encryptedData.ephemeralPublicKey,
                    ),
                    iv: base64ToArrayBuffer(encryptedData.iv),
                    ciphertext: base64ToArrayBuffer(encryptedData.ciphertext),
                },
                identity.privateKey,
            );

            return ok(existingRoomKey);
        }

        logger.info(
            `Self-key provisioning: ключ комнаты ${roomId} успешно создан`,
        );

        return ok(roomKey);
    } catch (error) {
        logger.error("Self-key provisioning: непредвиденная ошибка", error);
        return err(
            appError(
                ERROR_CODES.CRYPTO_ERROR,
                "Self-key provisioning: не удалось создать ключ",
                error,
            ),
        );
    }
}

/**
 * Находит существующий DM (прямой чат) или создает новый.
 */
export async function findOrCreateDM(
    currentUserId: string,
    targetUserId: string,
    isEphemeral = false,
): Promise<Result<string, RoomError>> {
    // 1. Оптимизация для Self-Chat: ищем комнату по имени "chat.favorites"
    if (currentUserId === targetUserId) {
        const existingResult =
            await roomRepository.findDirectRoomByOwnerAndName(
                currentUserId,
                "chat.favorites",
            );

        if (existingResult.isOk() && existingResult.value) {
            return ok(existingResult.value.id);
        }

        return err(
            appError(
                ERROR_CODES.NOT_FOUND,
                "Комната Избранное не найдена. Она должна быть создана при регистрации.",
            ),
        );
    }

    // 2. Ищем существующий DIRECT чат через репозиторий
    const existingDMResult = await roomRepository.findDirectRoomWith(
        currentUserId,
        targetUserId,
    );

    if (existingDMResult.isOk() && existingDMResult.value) {
        return ok(existingDMResult.value.id);
    }

    // 3. Если не нашли — создаем новый
    logger.info("Создание новой DM комнаты", {
        currentUserId,
        targetUserId,
        isEphemeral,
    });

    const createResult = await createRoom({
        type: ROOM_TYPE.DIRECT,
        myUserId: currentUserId,
        peerIds: [targetUserId],
        isEphemeral,
    });

    if (createResult.isErr()) {
        return err(createResult.error);
    }

    return ok(createResult.value.roomId);
}

/**
 * Получает список "Избранных" чатов для пользователя.
 */
export async function getFavoriteRooms(
    userId: string,
): Promise<Result<RoomWithMembers[], RoomRepoError>> {
    const starredRoomIdsResult =
        await messageRepository.getStarredRoomIds(userId);

    if (starredRoomIdsResult.isErr()) {
        return err(
            appError(
                ERROR_CODES.NETWORK_ERROR,
                "Не удалось загрузить список избранных сообщений",
                starredRoomIdsResult.error,
            ),
        );
    }
    // Собираем уникальные ID комнат
    const starredRoomIds = starredRoomIdsResult.value;
    // Добавляем ID "Saved Messages"
    const deterministicId = await generateDeterministicRoomId(userId);
    const allTargetRoomIds = [...new Set([...starredRoomIds, deterministicId])];

    return roomRepository.getRoomsWithMembersByIds(allTargetRoomIds);
}

/**
 * Получает полные данные комнаты (метаданные + расшифрованный ключ).
 * Только через репозитории, без прямого обращения к PocketBase.
 */
export async function getChatRoomData(
    roomId: string,
    userId: string,
): Promise<Result<RoomDataWithKey, AppError<string>>> {
    try {
        // 1. Получаем комнату
        const roomsResult = await roomRepository.getRoomsWithMembers(
            `${ROOM_FIELDS.ID} = "${roomId}"`,
        );

        if (roomsResult.isErr()) {
            return err(roomsResult.error);
        }

        const room = roomsResult.value[0];
        if (!room) {
            return err(
                appError(ERROR_CODES.NOT_FOUND_ERROR, "Комната не найдена"),
            );
        }

        // 2. Определяем собеседника (для DM)
        let otherUserId: string | undefined;
        if (room.type === ROOM_TYPE.DIRECT) {
            otherUserId = room.room_members?.find(
                (m) => m.user_id !== userId,
            )?.user_id;
        }

        // 3. Получаем зашифрованный ключ комнаты
        const keyResult = await roomRepository.getRoomKey(roomId, userId);

        // DEV-FALLBACK: Если ключ не найден и мы в разработке — генерируем временный
        if (keyResult.isErr() && import.meta.env.DEV) {
            logger.warn(
                "DEV-FALLBACK: Ключ комнаты не найден, генерируем временный",
            );
            const tempRoomKey = await generateDeterministicRoomKey(roomId);
            return ok({ room, roomKey: tempRoomKey, otherUserId });
        }

        // SELF-KEY PROVISIONING: Если ключ не найден и это Избранное — создаём автоматически
        if (keyResult.isErr() && room.name === DB_TABLES.FAVORITES) {
            logger.info(
                `Self-key provisioning: комната ${roomId} не имеет ключа, создаём...`,
            );
            const provisionResult = await provisionSelfChatKey(roomId, userId);
            if (provisionResult.isOk()) {
                return ok({
                    room,
                    roomKey: provisionResult.value,
                    otherUserId,
                });
            }
            // Если provisioning тоже не сработал — возвращаем ошибку provisioning
            return err(provisionResult.error);
        }

        if (keyResult.isErr()) {
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    "Ключ комнаты не найден. Шифрование не может быть инициализировано.",
                    keyResult.error,
                ),
            );
        }

        // 4. Извлекаем Identity для расшифровки
        const identity = await getKeyPair(KEYSTORE_TYPES.IDENTITY);

        // DEV-FALLBACK: Если Identity нет и мы в разработке — генерируем временный
        if (!identity && import.meta.env.DEV) {
            logger.warn(
                "DEV-FALLBACK: Ключи Identity не найдены, генерируем временный Room Key",
            );
            const tempRoomKey = await generateDeterministicRoomKey(roomId);
            return ok({ room, roomKey: tempRoomKey, otherUserId });
        }

        if (!identity) {
            return err(
                appError(ERROR_CODES.MISSING_KEYS, "Ключи не инициализированы"),
            );
        }

        // 5. Расшифровываем ключ комнаты
        try {
            const encryptedData = JSON.parse(keyResult.value.encrypted_key);
            const roomKey = await unwrapRoomKey(
                {
                    ephemeralPublicKey: base64ToArrayBuffer(
                        encryptedData.ephemeralPublicKey,
                    ),
                    iv: base64ToArrayBuffer(encryptedData.iv),
                    ciphertext: base64ToArrayBuffer(encryptedData.ciphertext),
                },
                identity.privateKey,
            );

            return ok({ room, roomKey, otherUserId });
        } catch (cryptoError) {
            if (import.meta.env.DEV) {
                logger.warn(
                    "DEV-FALLBACK: Ошибка расшифровки (вероятно seed-данные), генерируем временный ключ",
                );
                const tempRoomKey = await generateDeterministicRoomKey(roomId);
                return ok({ room, roomKey: tempRoomKey, otherUserId });
            }
            throw cryptoError;
        }
    } catch (error) {
        logger.error("Ошибка в getChatRoomData:", error);
        return err(
            appError(
                ERROR_CODES.CRYPTO_ERROR,
                "Не удалось подготовить данные чата",
                error,
            ),
        );
    }
}

export async function getUserRooms(
    userId: string,
): Promise<Result<RoomWithMembers[], RoomRepoError>> {
    return roomRepository.getUserRooms(userId);
}

/**
 * Получает счетчики непрочитанных сообщений для всех комнат пользователя.
 */
export async function getRoomUnreadCounts(
    userId: string,
): Promise<Result<UnreadCount[], AppError<string>>> {
    // 1. Получаем участников всех комнат пользователя через репозиторий
    const membersResult = await roomRepository.getRoomMembersByUserId(userId);
    if (membersResult.isErr()) {
        return err(membersResult.error);
    }

    // 2. Пакетно запрашиваем непрочитанные
    const rooms = membersResult.value.map((m) => ({
        id: m.room,
        last_read_at: m.last_read_at || DEFAULT_DATE,
    }));

    const countsResult = await messageRepository.getUnreadCountsBatch(
        rooms.map((r) => r.id),
        userId,
    );

    if (countsResult.isErr()) {
        return err(
            appError(
                ERROR_CODES.NETWORK_ERROR,
                "Не удалось получить счетчики",
                countsResult.error,
            ),
        );
    }

    return ok(countsResult.value);
}
