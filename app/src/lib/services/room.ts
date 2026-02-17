import type { PostgrestError } from "@supabase/supabase-js";
import { DB_TABLES, MEMBER_ROLE } from "@/lib/constants";
import { ERROR_CODES } from "@/lib/constants/errors";
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    generateDeterministicRoomId,
    generateRoomId,
    generateRoomKey,
    wrapRoomKey,
} from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import type { AppError, Result } from "@/lib/types/result";
import type { RoomKey, RoomMember } from "@/lib/types/room";
import { appError, err, ok } from "@/lib/utils/result";

export type RoomError =
    | AppError<typeof ERROR_CODES.DB_ERROR, PostgrestError>
    | AppError<typeof ERROR_CODES.MISSING_KEYS, { userIds: string[] }>
    | AppError<typeof ERROR_CODES.CRYPTO_ERROR, Error>
    | AppError<typeof ERROR_CODES.NOT_FOUND>;

/**
 * Сервис для управления комнатами (чатами).
 * Отвечает за создание комнат, добавление участников и управление ключами шифрования.
 */
export const RoomService = {
    /**
     * Создает новую комнату.
     * 1. Генерирует AES ключ.
     * 2. Шифрует его для каждого участника (ECDH).
     * 3. Создает записи в БД (Room, Members, Keys) транзакционно.
     */
    async createRoom(
        name: string | null,
        type: "direct" | "group",
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
            const missingIds = allMemberIds.filter(
                (id) => !foundIds.includes(id),
            );

            // В режиме MOCK разрешаем создавать комнату даже если профилей нет в БД
            if (import.meta.env.VITE_USE_MOCK === "true") {
                logger.warn("Using mock profiles for missing users", {
                    missingIds,
                });
                // Добавляем недостающие профили как заглушки для последующей логики
                for (const id of missingIds) {
                    profiles?.push({
                        id,
                        public_key_x25519: "mock_key", // Будет пропущено в блоке if (MOCK) ниже
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

        // 3. Транзакция в БД

        // A. Создаем комнату
        const { error: roomError } = await supabase
            .from(DB_TABLES.ROOMS)
            .insert({
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

        // B. Добавляем участников
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

        // C. Сохраняем ключи
        const { error: keysError } = await supabase
            .from(DB_TABLES.ROOM_KEYS)
            .insert(encryptedKeys);
        if (keysError) {
            return err(
                appError(ERROR_CODES.DB_ERROR, "Failed to add keys", keysError),
            );
        }

        return ok({ roomId, roomKey });
    },

    /**
     * Удаляет комнату и все связанные данные (ключи, участников).
     */
    async deleteRoom(roomId: string): Promise<Result<void, RoomError>> {
        // 1. Удаляем ключи
        const { error: keysError } = await supabase
            .from(DB_TABLES.ROOM_KEYS)
            .delete()
            .eq("room_id", roomId);
        if (keysError) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    "Failed to delete keys",
                    keysError,
                ),
            );
        }

        // 2. Удаляем участников
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

        // 3. Удаляем саму комнату
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
    },

    /**
     * Находит существующий DM (прямой чат) или создает новый.
     * Используется для начала переписки с пользователем.
     */
    async findOrCreateDM(
        currentUserId: string,
        targetUserId: string,
        isEphemeral = false,
    ): Promise<Result<string, RoomError>> {
        // Оптимизация для Self-Chat: используем детерминированный ID
        if (currentUserId === targetUserId) {
            const deterministicId =
                await generateDeterministicRoomId(currentUserId);

            // Проверяем существование (быстрый лукап по ID)
            const { data: existingRoom } = await supabase
                .from(DB_TABLES.ROOMS)
                .select("id")
                .eq("id", deterministicId)
                .single();

            if (existingRoom) {
                return ok(existingRoom.id);
            }

            // Если нет - создаем с этим ID
            logger.info("Creating deterministic Self-Chat room", {
                deterministicId,
            });
            const createResult = await this.createRoom(
                null,
                "direct",
                currentUserId,
                [targetUserId], // Это тот же самый юзер
                false,
                null,
                deterministicId, // !!! Передаем фиксированный ID
            );

            if (createResult.isErr()) {
                return err(createResult.error);
            }

            return ok(createResult.value.roomId);
        }

        // 1. Получаем список комнат текущего пользователя
        const { data: myMemberships, error: mbError } = await supabase
            .from(DB_TABLES.ROOM_MEMBERS)
            .select("room_id")
            .eq("user_id", currentUserId);

        if (mbError) {
            return err(
                appError(
                    ERROR_CODES.DB_ERROR,
                    "Failed to fetch memberships",
                    mbError,
                ),
            );
        }

        logger.info("findOrCreateDM: myMemberships", {
            count: myMemberships?.length,
        });

        if (myMemberships && myMemberships.length > 0) {
            const myRoomIds = myMemberships.map((m) => m.room_id);

            // 2. Ищем среди них прямые чаты (type='direct')
            const { data: candidateRooms, error: roomError } = await supabase
                .from(DB_TABLES.ROOMS)
                .select("id")
                .in("id", myRoomIds)
                .eq("type", "direct")
                .eq("is_ephemeral", isEphemeral);

            if (roomError) {
                return err(
                    appError(
                        ERROR_CODES.DB_ERROR,
                        "Failed to fetch candidate rooms",
                        roomError,
                    ),
                );
            }

            logger.info("findOrCreateDM: candidateRooms", {
                count: candidateRooms?.length,
            });

            if (candidateRooms) {
                for (const room of candidateRooms) {
                    // 3. Проверяем участников комнаты
                    const { data: members, error: membersError } =
                        await supabase
                            .from(DB_TABLES.ROOM_MEMBERS)
                            .select("user_id")
                            .eq("room_id", room.id);

                    if (!membersError) {
                        const memberIds = members.map((m) => m.user_id);
                        const isSelfChat = currentUserId === targetUserId;

                        // Case 1: Чат с самим собой (1 участник)
                        if (
                            isSelfChat &&
                            memberIds.length === 1 &&
                            memberIds[0] === currentUserId
                        ) {
                            logger.info("Found existing Self-Chat room", {
                                roomId: room.id,
                            });
                            return ok(room.id);
                        }

                        // Case 2: P2P чат (2 участника)
                        if (
                            !isSelfChat &&
                            memberIds.length === 2 &&
                            memberIds.includes(targetUserId)
                        ) {
                            logger.info("Found existing DM room", {
                                roomId: room.id,
                            });
                            return ok(room.id);
                        }
                    }
                }
            }
        }

        // 4. Если не нашли — создаем новую
        logger.info("Creating new DM room", {
            currentUserId,
            targetUserId,
            isEphemeral,
        });

        const createResult = await this.createRoom(
            null, // DM не имеет названия при создании
            "direct",
            currentUserId,
            [targetUserId],
            isEphemeral,
        );

        if (createResult.isErr()) {
            return err(createResult.error);
        }

        return ok(createResult.value.roomId);
    },
};
