import { ERROR_CODES } from "@/lib/constants";
import { generateRoomId, generateRoomKey } from "@/lib/crypto/rooms";
import { logger } from "@/lib/logger";
import { roomRepository } from "@/lib/repositories/room.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import type {
    Result,
    RoomError,
    RoomMembersRoleOptions,
    RoomType,
} from "@/lib/types";
import { appError, err, ok } from "@/lib/utils/result";
import { encryptRoomKeysForMembers } from "./crypto";

/**
 * Параметры для создания комнаты
 */
export interface CreateRoomOptions {
    name?: string | null;
    type: RoomType;
    myUserId: string;
    peerIds: string[];
    isEphemeral?: boolean;
    avatarUrl?: string | null;
    forcedRoomId?: string;
}

/**
 * Создает новую комнату.
 * 1. Генерирует AES ключ.
 * 2. Шифрует его для каждого участника (ECDH).
 * 3. Создает записи в БД (Room, Members, Keys).
 */
export async function createRoom({
    name = null,
    type,
    myUserId,
    peerIds,
    isEphemeral = false,
    avatarUrl = null,
    forcedRoomId,
}: CreateRoomOptions): Promise<
    Result<{ roomId: string; roomKey: CryptoKey }, RoomError>
> {
    const allMemberIds = [...new Set([myUserId, ...peerIds])];
    const roomKey = await generateRoomKey();
    const roomId = forcedRoomId || generateRoomId();

    try {
        if (allMemberIds.length === 0) {
            return err(
                appError(
                    ERROR_CODES.MISSING_KEYS,
                    "Нет участников для создания комнаты",
                    {
                        userIds: [],
                    },
                ),
            );
        }

        // 1. Получаем публичные ключи участников
        const profilesListResult =
            await userRepository.getProfilesByIds(allMemberIds);

        if (profilesListResult.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    profilesListResult.error.message,
                    profilesListResult.error.details instanceof Error
                        ? profilesListResult.error.details
                        : undefined,
                ),
            );
        }

        const profiles = profilesListResult.value;

        if (profiles.length !== allMemberIds.length) {
            const foundIds = profiles.map((p) => p.id);
            const missingIds = allMemberIds.filter(
                (id) => !foundIds.includes(id),
            );

            return err(
                appError(
                    ERROR_CODES.MISSING_KEYS,
                    "Некоторые пользователи не найдены",
                    {
                        userIds: missingIds,
                    },
                ),
            );
        }

        const validProfiles = profiles.map((p) => ({
            id: p.id,
            public_key_x25519: p.public_key_x25519,
        }));

        const cryptoResult = await encryptRoomKeysForMembers(
            validProfiles,
            roomKey,
            roomId,
            myUserId,
        );

        if (cryptoResult.isErr()) {
            return err(cryptoResult.error);
        }

        const { encryptedKeys, roomMembers } = cryptoResult.value;

        const createResult = await roomRepository.createRoomWithMembersAndKeys(
            {
                id: roomId,
                type,
                name: name ?? undefined,
                created_by: myUserId,
                visibility: "private",
            },
            roomMembers,
            encryptedKeys,
        );

        if (createResult.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    createResult.error.message,
                    createResult.error.details instanceof Error
                        ? createResult.error.details
                        : undefined,
                ),
            );
        }

        logger.info("Комната успешно создана", {
            roomId,
            type,
            isEphemeral,
            avatarUrl,
        });

        return ok({ roomId, roomKey });
    } catch (e) {
        logger.error("Ошибка при создании комнаты", e);
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Не удалось создать комнату в базе данных",
                e instanceof Error ? e : undefined,
            ),
        );
    }
}

/**
 * Удаляет комнату и все связанные данные.
 */
export async function deleteRoom(
    roomId: string,
): Promise<Result<void, RoomError>> {
    try {
        const result =
            await roomRepository.deleteRoomWithMembersAndKeys(roomId);
        if (result.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    result.error.message,
                    result.error.details instanceof Error
                        ? result.error.details
                        : undefined,
                ),
            );
        }

        return ok(undefined);
    } catch (e) {
        logger.error("Ошибка при удалении комнаты", e);
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Не удалось удалить комнату из базы данных",
                e instanceof Error ? e : undefined,
            ),
        );
    }
}

/**
 * Добавляет участников в существующую группу.
 */
export async function addMembersToGroup(
    roomId: string,
    newMemberIds: string[],
    roomKey: CryptoKey,
    myUserId: string,
): Promise<Result<void, RoomError>> {
    try {
        if (newMemberIds.length === 0) {
            return ok(undefined);
        }

        const profilesResult =
            await userRepository.getProfilesByIds(newMemberIds);

        if (profilesResult.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    profilesResult.error.message,
                    profilesResult.error.details instanceof Error
                        ? profilesResult.error.details
                        : undefined,
                ),
            );
        }

        const profiles = profilesResult.value;

        if (profiles.length !== newMemberIds.length) {
            const foundIds = profiles.map((p) => p.id);
            const missingIds = newMemberIds.filter(
                (id) => !foundIds.includes(id),
            );
            return err(
                appError(
                    ERROR_CODES.MISSING_KEYS,
                    "Некоторые пользователи не найдены",
                    {
                        userIds: missingIds,
                    },
                ),
            );
        }

        const validProfiles = profiles.map((p) => ({
            id: p.id,
            public_key_x25519: p.public_key_x25519,
        }));

        const cryptoResult = await encryptRoomKeysForMembers(
            validProfiles,
            roomKey,
            roomId,
            myUserId,
        );

        if (cryptoResult.isErr()) {
            return err(cryptoResult.error);
        }

        const { encryptedKeys, roomMembers } = cryptoResult.value;

        const result = await roomRepository.addMembersAndKeysToRoom(
            roomMembers,
            encryptedKeys,
        );
        if (result.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    result.error.message,
                    result.error.details instanceof Error
                        ? result.error.details
                        : undefined,
                ),
            );
        }

        return ok(undefined);
    } catch (e) {
        logger.error("Ошибка при добавлении участников в группу", e);
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Не удалось добавить участников в базу данных",
                e instanceof Error ? e : undefined,
            ),
        );
    }
}

/**
 * Удаляет участника из группы.
 */
export async function removeMemberFromGroup(
    roomId: string,
    userIdToRemove: string,
): Promise<Result<void, RoomError>> {
    try {
        const result = await roomRepository.removeMemberAndKeyFromRoom(
            roomId,
            userIdToRemove,
        );
        if (result.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    result.error.message,
                    result.error.details instanceof Error
                        ? result.error.details
                        : undefined,
                ),
            );
        }

        return ok(undefined);
    } catch (e) {
        logger.error("Ошибка при удалении участника из группы", e);
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Не удалось удалить участника из базы данных",
                e instanceof Error ? e : undefined,
            ),
        );
    }
}

/**
 * Меняет роль пользователя в группе.
 */
export async function updateMemberRole(
    roomId: string,
    targetUserId: string,
    newRole: RoomMembersRoleOptions,
): Promise<Result<void, RoomError>> {
    try {
        const memberResult = await roomRepository.getMemberByRoomAndUser(
            roomId,
            targetUserId,
        );
        if (memberResult.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    memberResult.error.message,
                    memberResult.error.details instanceof Error
                        ? memberResult.error.details
                        : undefined,
                ),
            );
        }

        const result = await roomRepository.updateMember(
            memberResult.value.id,
            {
                role: newRole,
            },
        );
        if (result.isErr()) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    result.error.message,
                    result.error.details instanceof Error
                        ? result.error.details
                        : undefined,
                ),
            );
        }

        return ok(undefined);
    } catch (e) {
        logger.error("Ошибка при обновлении роли участника", e);
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Не удалось обновить роль участника в базе данных",
                e instanceof Error ? e : undefined,
            ),
        );
    }
}

/**
 * Выход из группы.
 */
export async function leaveGroup(
    roomId: string,
    myUserId: string,
): Promise<Result<void, RoomError>> {
    return removeMemberFromGroup(roomId, myUserId);
}
