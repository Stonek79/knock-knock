import { DB_TABLES, ERROR_CODES } from "@/lib/constants";
import { generateDeterministicRoomId } from "@/lib/crypto/rooms";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import type { Result, RoomError } from "@/lib/types";
import { appError, err, ok } from "@/lib/utils/result";
import { createRoom } from "./mutations";

/**
 * Находит существующий DM (прямой чат) или создает новый.
 * Используется для начала переписки с пользователем.
 */
export async function findOrCreateDM(
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
        const createResult = await createRoom(
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
                const { data: members, error: membersError } = await supabase
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

    const createResult = await createRoom(
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
}
