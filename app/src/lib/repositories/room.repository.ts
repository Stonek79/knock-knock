import {
    DB_EXPAND,
    DB_TABLES,
    ERROR_CODES,
    ROOM_FIELDS,
    ROOM_MEMBER_FIELDS,
    ROOM_TYPE,
} from "../constants";
import { pb } from "../pocketbase";
import type {
    PBRealtimeAction,
    PBRealtimeEvent,
    Result,
    RoomExpand,
    RoomKeysResponse,
    RoomMemberRecord,
    RoomMembersResponse,
    RoomRepoError,
    RoomsResponse,
    RoomWithMembers,
} from "../types";
import { appError, err, fromPromise, ok } from "../utils/result";
import { type PBRoomExpanded, RoomMapper } from "./mappers/roomMapper";

/**
 * FUNCTIONAL ROOM REPOSITORY
 * Управляет комнатами, участниками и ключами доступа.
 */
export const roomRepository = {
    /**
     * Получение комнаты по ID
     */
    getRoomById: async (
        roomId: string,
        expand: RoomExpand[] = [
            ROOM_FIELDS.CREATED_BY,
            ROOM_FIELDS.LAST_MESSAGE,
            DB_EXPAND.MEMBERS,
        ],
    ): Promise<Result<RoomWithMembers, RoomRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.ROOMS).getOne<PBRoomExpanded>(roomId, {
                expand: expand.join(","),
                $autoCancel: false,
            }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NOT_FOUND_ERROR,
                    `Комната ${roomId} не найдена`,
                    e,
                ),
        ).map((record) =>
            RoomMapper.toDomain(record, (rec, file) =>
                pb.files.getURL(rec, file),
            ),
        );
    },

    /**
     * Получение списка комнат по ID
     */
    getRoomsByIds: async (
        roomIds: string[],
    ): Promise<Result<RoomWithMembers[], RoomRepoError>> => {
        if (roomIds.length === 0) {
            return ok([]);
        }

        const filter = roomIds
            .map((id) => pb.filter(`${ROOM_FIELDS.ID} = {:id}`, { id }))
            .join(" || ");

        return roomRepository.getRoomsWithMembers(filter);
    },

    /**
     * Получение списка комнат пользователя
     */
    getUserRooms: async (
        userId: string,
    ): Promise<Result<RoomWithMembers[], RoomRepoError>> => {
        // 1. Получаем ID всех комнат, в которых состоит пользователь
        const membersResult =
            await roomRepository.getRoomMembersByUserId(userId);

        if (membersResult.isErr()) {
            return err(membersResult.error);
        }

        const roomIds = membersResult.value.map(
            (m) => m[ROOM_MEMBER_FIELDS.ROOM] as string,
        );
        if (roomIds.length === 0) {
            return ok([]);
        }
        // 2. Вызываем наш метод, чтобы получить комнаты с участниками по этим ID
        return roomRepository.getRoomsWithMembersByIds(roomIds);
    },

    /**
     * Создание новой комнаты
     */
    createRoom: async (
        data: Partial<RoomsResponse>,
    ): Promise<Result<RoomWithMembers, RoomRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.ROOMS).create<PBRoomExpanded>(data),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось создать комнату",
                    e,
                );
            },
        ).map((record) =>
            RoomMapper.toDomain(record, (rec, file) =>
                pb.files.getURL(rec, file),
            ),
        );
    },

    /**
     * Удаление комнаты
     */
    deleteRoom: async (
        roomId: string,
    ): Promise<Result<boolean, RoomRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.ROOMS).delete(roomId),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    `Ошибка при удалении комнаты ${roomId}`,
                    e,
                );
            },
        );
    },

    /**
     * Получить участников комнаты
     */
    getRoomMembers: async (
        roomId: string,
    ): Promise<Result<RoomMemberRecord[], RoomRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.ROOM_MEMBERS)
                .getFullList<RoomMemberRecord>({
                    filter: pb.filter(
                        `${ROOM_MEMBER_FIELDS.ROOM} = {:roomId}`,
                        { roomId },
                    ),
                    $autoCancel: false,
                }),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при загрузке участников",
                    e,
                );
            },
        );
    },

    /**
     * Подписка на изменения в коллекции участников (room_members).
     */
    subscribeToMemberChanges: (
        callback: (event: PBRealtimeEvent<RoomMemberRecord>) => void,
    ): (() => void) => {
        const unsubscribePromise = pb
            .collection(DB_TABLES.ROOM_MEMBERS)
            .subscribe<RoomMemberRecord>("*", (e) => {
                callback({
                    action: e.action as PBRealtimeAction,
                    record: e.record,
                });
            });

        return () => {
            unsubscribePromise.then((unsub) => unsub());
        };
    },

    /**
     * Найти приватный чат (direct) с конкретным пользователем
     */
    findDirectRoomWith: async (
        currentUserId: string,
        targetUserId: string,
    ): Promise<Result<RoomWithMembers | null, RoomRepoError>> => {
        const currentUserRoomsResult =
            await roomRepository.getRoomMembersByUserId(currentUserId);
        if (currentUserRoomsResult.isErr()) {
            return err(currentUserRoomsResult.error);
        }

        const roomIds = currentUserRoomsResult.value.map(
            (m: RoomMemberRecord) => m[ROOM_MEMBER_FIELDS.ROOM],
        );

        if (roomIds.length === 0) {
            return ok(null);
        }

        const filterIds = roomIds
            .map((id: string) =>
                pb.filter(`${ROOM_MEMBER_FIELDS.ROOM} = {:id}`, { id }),
            )
            .join(" || ");

        const targetMemberResult = await fromPromise(
            pb
                .collection(DB_TABLES.ROOM_MEMBERS)
                .getFirstListItem<RoomMemberRecord>(
                    `${ROOM_MEMBER_FIELDS.USER} = "${targetUserId}" && (${filterIds})`,
                    { $autoCancel: false },
                ),
            (e: unknown): RoomMemberRecord | null | RoomRepoError => {
                const error = e as { status?: number };
                if (error?.status === 404) {
                    return null;
                }
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при поиске общего чата",
                    e,
                );
            },
        );

        if (targetMemberResult.isErr()) {
            if (targetMemberResult.error === null) {
                return ok(null);
            }
            return err(targetMemberResult.error as RoomRepoError);
        }

        if (!targetMemberResult.value) {
            return ok(null);
        }

        const roomId = targetMemberResult.value[ROOM_MEMBER_FIELDS.ROOM];
        const roomDataResult = await roomRepository.getRoomById(roomId);

        if (
            roomDataResult.isOk() &&
            roomDataResult.value.type === ROOM_TYPE.DIRECT
        ) {
            return ok(roomDataResult.value);
        }

        return ok(null);
    },

    /**
     * Найти личную комнату по владельцу и имени (например, Избранное)
     */
    findDirectRoomByOwnerAndName: async (
        ownerId: string,
        name: string,
    ): Promise<Result<RoomWithMembers | null, RoomRepoError>> => {
        return fromPromise<PBRoomExpanded, RoomRepoError>(
            pb
                .collection(DB_TABLES.ROOMS)
                .getFirstListItem<PBRoomExpanded>(
                    pb.filter(
                        `${ROOM_FIELDS.CREATED_BY} = {:ownerId} && ${ROOM_FIELDS.NAME} = {:name} && ${ROOM_FIELDS.TYPE} = "${ROOM_TYPE.DIRECT}"`,
                        { ownerId, name },
                    ),
                    {
                        expand: `${DB_EXPAND.MEMBERS},${DB_EXPAND.LAST_MESSAGE}`,
                        $autoCancel: false,
                    },
                ),
            (e: unknown): RoomRepoError => {
                const error = e as { status?: number };
                if (error?.status === 404) {
                    // Возвращаем специальную ошибку или null через Result позже
                    return appError(
                        ERROR_CODES.NOT_FOUND_ERROR,
                        "Not found",
                        e,
                    );
                }
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    `Ошибка при поиске комнаты по имени ${name}`,
                    e,
                );
            },
        )
            .match<RoomWithMembers | null>(
                (record) =>
                    RoomMapper.toDomain(record, (rec, file) =>
                        pb.files.getURL(rec, file),
                    ),
                (err) => {
                    if (err.kind === ERROR_CODES.NOT_FOUND_ERROR) {
                        return null;
                    }
                    throw err; // Пробрасываем реальные сетевые ошибки
                },
            )
            .then((val) => ok(val));
    },

    /** Вспомогательные методы для участников */

    getRoomMembersByUserId: async (
        userId: string,
    ): Promise<Result<RoomMemberRecord[], RoomRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.ROOM_MEMBERS)
                .getFullList<RoomMemberRecord>({
                    filter: pb.filter(
                        `${ROOM_MEMBER_FIELDS.USER} = {:userId}`,
                        { userId },
                    ),
                    $autoCancel: false,
                }),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка поиска участников",
                    e,
                );
            },
        );
    },

    getRoomsWithMembers: async (
        filter: string,
    ): Promise<Result<RoomWithMembers[], RoomRepoError>> => {
        const expandPath = `${DB_EXPAND.MEMBERS},${DB_EXPAND.LAST_MESSAGE}`;

        return fromPromise(
            pb.collection(DB_TABLES.ROOMS).getFullList<PBRoomExpanded>({
                filter,
                expand: expandPath,
                $autoCancel: false,
            }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось загрузить комнаты",
                    e,
                ),
        ).map((rooms) => {
            return rooms.map((room) =>
                RoomMapper.toDomain(room, (rec, file) =>
                    pb.files.getURL(rec, file),
                ),
            );
        });
    },

    /**
     * Получает список комнат по массиву ID с маппингом участников.
     */
    getRoomsWithMembersByIds: async (
        roomIds: string[],
    ): Promise<Result<RoomWithMembers[], RoomRepoError>> => {
        if (roomIds.length === 0) {
            return ok([]);
        }
        const filter = roomIds
            .map((id) => pb.filter(`${ROOM_FIELDS.ID} = {:id}`, { id }))
            .join(" || ");
        return roomRepository.getRoomsWithMembers(filter);
    },

    addMember: async (
        data: Partial<RoomMembersResponse>,
    ): Promise<Result<RoomMemberRecord, RoomRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.ROOM_MEMBERS)
                .create<RoomMemberRecord>(data),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось добавить участника",
                    e,
                );
            },
        );
    },

    removeMember: async (
        memberId: string,
    ): Promise<Result<boolean, RoomRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.ROOM_MEMBERS).delete(memberId),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось удалить участника",
                    e,
                );
            },
        );
    },

    updateMember: async (
        memberId: string,
        data: Partial<RoomMembersResponse>,
    ): Promise<Result<RoomMemberRecord, RoomRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.ROOM_MEMBERS)
                .update<RoomMemberRecord>(memberId, data),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось обновить роль участника",
                    e,
                );
            },
        );
    },

    getMemberByRoomAndUser: async (
        roomId: string,
        userId: string,
    ): Promise<Result<RoomMemberRecord, RoomRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.ROOM_MEMBERS)
                .getFirstListItem<RoomMemberRecord>(
                    pb.filter(
                        `${ROOM_MEMBER_FIELDS.ROOM} = {:roomId} && ${ROOM_MEMBER_FIELDS.USER} = {:userId}`,
                        { roomId, userId },
                    ),
                    { $autoCancel: false },
                ),
            (e: unknown) => {
                const error = e as { status?: number };
                if (error?.status !== 404) {
                    return appError(
                        ERROR_CODES.NETWORK_ERROR,
                        "Ошибка при поиске участника",
                        e,
                    );
                }
                return appError(
                    ERROR_CODES.NOT_FOUND_ERROR,
                    "Участник не найден в комнате",
                    e,
                );
            },
        );
    },

    /** Методы для ключей комнат */

    createRoomKey: async (data: {
        room: string;
        user: string;
        encrypted_key: string;
    }): Promise<Result<void, RoomRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.ROOM_KEYS)
                .create(data), // Поля data согласованы с БД
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось сохранить ключ комнаты",
                    e,
                );
            },
        ).map(() => undefined);
    },

    getRoomKeysByFilter: async (
        filter: string,
    ): Promise<Result<{ id: string }[], RoomRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.ROOM_KEYS).getFullList<{ id: string }>({
                filter,
                fields: ROOM_FIELDS.ID, // "id"
            }),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при получении ключей",
                    e,
                );
            },
        );
    },

    getRoomKey: async (
        roomId: string,
        userId: string,
    ): Promise<Result<RoomKeysResponse, RoomRepoError>> => {
        /**
         * ВНИМАНИЕ: Для ключей мы используем ключи ROOM_MEMBER_FIELDS, так как поля "room" и "user"
         * совпадают (константы ROOM_MEMBER_FIELDS.ROOM и ROOM_MEMBER_FIELDS.USER)
         */
        return fromPromise(
            pb
                .collection(DB_TABLES.ROOM_KEYS)
                .getFirstListItem<RoomKeysResponse>(
                    pb.filter(
                        `${ROOM_MEMBER_FIELDS.ROOM} = {:roomId} && ${ROOM_MEMBER_FIELDS.USER} = {:userId}`,
                        { roomId, userId },
                    ),
                    { $autoCancel: false },
                ),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось загрузить ключ комнаты",
                    e,
                );
            },
        );
    },

    deleteRoomKey: async (
        keyId: string,
    ): Promise<Result<boolean, RoomRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.ROOM_KEYS).delete(keyId),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось удалить ключ",
                    e,
                );
            },
        );
    },

    /** Пакетные операции (Транзакции) */

    createRoomWithMembersAndKeys: async (
        roomData: Partial<RoomsResponse>,
        membersData: Partial<RoomMembersResponse>[],
        keysData: Partial<RoomKeysResponse>[],
    ): Promise<Result<void, RoomRepoError>> => {
        try {
            const batch = pb.createBatch();
            batch.collection(DB_TABLES.ROOMS).create(roomData);

            for (const m of membersData) {
                batch.collection(DB_TABLES.ROOM_MEMBERS).create(m);
            }

            for (const k of keysData) {
                batch.collection(DB_TABLES.ROOM_KEYS).create(k);
            }

            await batch.send();

            return ok(undefined);
        } catch (e) {
            return err(
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось создать комнату с участниками",
                    e,
                ),
            );
        }
    },

    deleteRoomWithMembersAndKeys: async (
        roomId: string,
    ): Promise<Result<void, RoomRepoError>> => {
        try {
            const batch = pb.createBatch();

            const keysResult = await roomRepository.getRoomKeysByFilter(
                pb.filter(`${ROOM_MEMBER_FIELDS.ROOM} = {:roomId}`, { roomId }),
            );

            if (keysResult.isOk()) {
                for (const k of keysResult.value) {
                    batch.collection(DB_TABLES.ROOM_KEYS).delete(k.id);
                }
            }

            const membersResult = await roomRepository.getRoomMembers(roomId);

            if (membersResult.isOk()) {
                for (const m of membersResult.value) {
                    batch.collection(DB_TABLES.ROOM_MEMBERS).delete(m.id);
                }
            }

            batch.collection(DB_TABLES.ROOMS).delete(roomId);

            await batch.send();
            return ok(undefined);
        } catch (e) {
            return err(
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось удалить комнату",
                    e,
                ),
            );
        }
    },

    addMembersAndKeysToRoom: async (
        membersData: Partial<RoomMembersResponse>[],
        keysData: Partial<RoomKeysResponse>[],
    ): Promise<Result<void, RoomRepoError>> => {
        try {
            const batch = pb.createBatch();

            for (const m of membersData) {
                batch.collection(DB_TABLES.ROOM_MEMBERS).create(m);
            }

            for (const k of keysData) {
                batch.collection(DB_TABLES.ROOM_KEYS).create(k);
            }

            await batch.send();

            return ok(undefined);
        } catch (e) {
            return err(
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось добавить участников",
                    e,
                ),
            );
        }
    },

    removeMemberAndKeyFromRoom: async (
        roomId: string,
        userIdToRemove: string,
    ): Promise<Result<void, RoomRepoError>> => {
        try {
            const memberResult = await roomRepository.getMemberByRoomAndUser(
                roomId,
                userIdToRemove,
            );

            if (memberResult.isErr()) {
                return err(memberResult.error);
            }

            const batch = pb.createBatch();
            batch
                .collection(DB_TABLES.ROOM_MEMBERS)
                .delete(memberResult.value.id);

            const keysFilter = pb.filter(
                `${ROOM_MEMBER_FIELDS.ROOM} = {:roomId} && ${ROOM_MEMBER_FIELDS.USER} = {:userId}`,
                { roomId, userId: userIdToRemove },
            );
            const keysResult =
                await roomRepository.getRoomKeysByFilter(keysFilter);

            if (keysResult.isOk() && keysResult.value.length > 0) {
                batch
                    .collection(DB_TABLES.ROOM_KEYS)
                    .delete(keysResult.value[0].id);
            }

            await batch.send();

            return ok(undefined);
        } catch (e) {
            return err(
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось удалить участника",
                    e,
                ),
            );
        }
    },
};
