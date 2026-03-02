import { DB_TABLES, ERROR_CODES, MEMBER_ROLE } from "@/lib/constants";
import { generateRoomId, generateRoomKey } from "@/lib/crypto/rooms";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import type { Result, RoomError, RoomType } from "@/lib/types";
import { appError, err, ok } from "@/lib/utils/result";
import { encryptRoomKeysForMembers } from "./crypto";

/**
 * Создает новую комнату.
 * 1. Генерирует AES ключ.
 * 2. Шифрует его для каждого участника (ECDH).
 * 3. Создает записи в БД (Room, Members, Keys) транзакционно.
 */
export async function createRoom(
    name: string | null,
    type: RoomType,
    myUserId: string,
    peerIds: string[],
    isEphemeral = false,
    avatarUrl: string | null = null,
    forcedRoomId?: string, // Опциональный ID (для детерминированных чатов)
): Promise<Result<{ roomId: string; roomKey: CryptoKey }, RoomError>> {
    const allMemberIds = [...new Set([myUserId, ...peerIds])];
    const roomKey = await generateRoomKey();
    const roomId = forcedRoomId || generateRoomId();

    // 1. Получаем публичные ключи участников
    const { data: profiles, error: profilesError } = await supabase
        .from(DB_TABLES.PROFILES)
        .select("id, public_key_x25519")
        .in("id", allMemberIds);

    if (profilesError) {
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Failed to fetch profiles",
                profilesError,
            ),
        );
    }

    if (!profiles || profiles.length !== allMemberIds.length) {
        const foundIds = profiles?.map((p) => p.id) || [];
        const missingIds = allMemberIds.filter((id) => !foundIds.includes(id));

        // В режиме MOCK разрешаем создавать комнату даже если профилей нет в БД
        if (import.meta.env.VITE_USE_MOCK === "true") {
            logger.warn("Using mock profiles for missing users", {
                missingIds,
            });
            for (const id of missingIds) {
                profiles?.push({
                    id,
                    public_key_x25519: "mock_key",
                });
            }
        } else {
            return err(
                appError(ERROR_CODES.MISSING_KEYS, "Some users not found", {
                    userIds: missingIds,
                }),
            );
        }
    }

    // 2. Шифруем RoomKey для каждого участника
    const cryptoResult = await encryptRoomKeysForMembers(
        profiles,
        roomKey,
        roomId,
        myUserId,
    );

    if (cryptoResult.isErr()) {
        return err(cryptoResult.error);
    }

    const { encryptedKeys, roomMembers } = cryptoResult.value;

    // 3. Транзакция в БД
    const { error: roomError } = await supabase.from(DB_TABLES.ROOMS).insert({
        id: roomId,
        type,
        name,
        avatar_url: avatarUrl,
        is_ephemeral: isEphemeral,
    });

    if (roomError) {
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Failed to create room record",
                roomError,
            ),
        );
    }

    const { error: membersError } = await supabase
        .from(DB_TABLES.ROOM_MEMBERS)
        .insert(roomMembers);

    if (membersError) {
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Failed to add members",
                membersError,
            ),
        );
    }

    const { error: keysError } = await supabase
        .from(DB_TABLES.ROOM_KEYS)
        .insert(encryptedKeys);

    if (keysError) {
        return err(
            appError(ERROR_CODES.DB_ERROR, "Failed to add keys", keysError),
        );
    }

    return ok({ roomId, roomKey });
}

/**
 * Удаляет комнату и все связанные данные (ключи, участников).
 */
export async function deleteRoom(
    roomId: string,
): Promise<Result<void, RoomError>> {
    const { error: keysError } = await supabase
        .from(DB_TABLES.ROOM_KEYS)
        .delete()
        .eq("room_id", roomId);

    if (keysError) {
        return err(
            appError(ERROR_CODES.DB_ERROR, "Failed to delete keys", keysError),
        );
    }

    const { error: membersError } = await supabase
        .from(DB_TABLES.ROOM_MEMBERS)
        .delete()
        .eq("room_id", roomId);

    if (membersError) {
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Failed to delete members",
                membersError,
            ),
        );
    }

    const { error } = await supabase
        .from(DB_TABLES.ROOMS)
        .delete()
        .eq("id", roomId);

    if (error) {
        logger.warn(
            "Could not delete room record (possbily restricted)",
            error,
        );
        return err(
            appError(ERROR_CODES.DB_ERROR, "Failed to delete room", error),
        );
    }

    return ok(undefined);
}

/**
 * Добавляет участников в существующую группу.
 * 1. Получает публичные ключи новых участников.
 * 2. Шифрует roomKey для них.
 * 3. Транзакционно добавляет в БД.
 */
export async function addMembersToGroup(
    roomId: string,
    newMemberIds: string[],
    roomKey: CryptoKey,
    myUserId: string,
): Promise<Result<void, RoomError>> {
    // 1. Получаем профили новых участников
    const { data: profiles, error: profilesError } = await supabase
        .from(DB_TABLES.PROFILES)
        .select("id, public_key_x25519")
        .in("id", newMemberIds);

    if (profilesError) {
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Failed to fetch profiles",
                profilesError,
            ),
        );
    }

    if (!profiles || profiles.length !== newMemberIds.length) {
        const foundIds = profiles?.map((p) => p.id) || [];
        const missingIds = newMemberIds.filter((id) => !foundIds.includes(id));

        if (import.meta.env.VITE_USE_MOCK === "true") {
            logger.warn("Using mock profiles for missing users in addMembers", {
                missingIds,
            });
            for (const id of missingIds) {
                profiles?.push({
                    id,
                    public_key_x25519: "mock_key",
                });
            }
        } else {
            return err(
                appError(ERROR_CODES.MISSING_KEYS, "Some users not found", {
                    userIds: missingIds,
                }),
            );
        }
    }

    // 2. Шифруем ключ комнаты для новых участников
    const cryptoResult = await encryptRoomKeysForMembers(
        profiles,
        roomKey,
        roomId,
        myUserId, // Здесь myUserId используется как инициатор и все добавляемые делаются обычными MEMBER
    );

    if (cryptoResult.isErr()) {
        return err(cryptoResult.error);
    }

    const { encryptedKeys, roomMembers } = cryptoResult.value;

    // Временно изменяем роль добавленных пользователей на MEMBER (в encryptRoomKeysForMembers добавляющий становится ADMIN)
    const fixedRoomMembers = roomMembers.map((member) => ({
        ...member,
        role: MEMBER_ROLE.MEMBER,
    }));

    // 3. Инсерт в БД
    const { error: membersError } = await supabase
        .from(DB_TABLES.ROOM_MEMBERS)
        .insert(fixedRoomMembers);

    if (membersError) {
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Failed to add new members",
                membersError,
            ),
        );
    }

    const { error: keysError } = await supabase
        .from(DB_TABLES.ROOM_KEYS)
        .insert(encryptedKeys);

    if (keysError) {
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Failed to add keys for new members",
                keysError,
            ),
        );
    }

    return ok(undefined);
}

/**
 * Удаляет участника из группы.
 * Удаляет его из room_members и room_keys.
 */
export async function removeMemberFromGroup(
    roomId: string,
    userIdToRemove: string,
): Promise<Result<void, RoomError>> {
    // Удаляем из members
    const { error: membersError } = await supabase
        .from(DB_TABLES.ROOM_MEMBERS)
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", userIdToRemove);

    if (membersError) {
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Failed to remove member",
                membersError,
            ),
        );
    }

    // Удаляем ключ
    const { error: keysError } = await supabase
        .from(DB_TABLES.ROOM_KEYS)
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", userIdToRemove);

    if (keysError) {
        logger.warn("Failed to delete room key for removed user", keysError);
        // Не критично (он не увидит новые сообщения, т.к. нас больше нет в members, но лучше удалить)
    }

    return ok(undefined);
}

/**
 * Меняет роль пользователя в группе.
 */
export async function updateMemberRole(
    roomId: string,
    targetUserId: string,
    newRole: (typeof MEMBER_ROLE)[keyof typeof MEMBER_ROLE],
): Promise<Result<void, RoomError>> {
    const { error } = await supabase
        .from(DB_TABLES.ROOM_MEMBERS)
        .update({ role: newRole })
        .eq("room_id", roomId)
        .eq("user_id", targetUserId);

    if (error) {
        return err(
            appError(
                ERROR_CODES.DB_ERROR,
                "Failed to update member role",
                error,
            ),
        );
    }

    return ok(undefined);
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
