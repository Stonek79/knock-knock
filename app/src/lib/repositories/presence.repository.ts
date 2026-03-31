import { DB_TABLES, ERROR_CODES, PRESENCE_FIELDS } from "@/lib/constants";
import { pb } from "@/lib/pocketbase";
import type {
    PBPresenceStatus,
    PBRealtimeAction,
    PBRealtimeEvent,
    PresenceRepoError,
} from "@/lib/types";
import { appError, fromPromise, type Result } from "@/lib/utils/result";

/**
 * Репозиторий для управления статусами присутствия пользователей.
 * Абстрагирует коллекцию 'presence_status'.
 */
export const presenceRepository = {
    /**
     * Получает статус присутствия конкретного пользователя.
     */
    getPresenceByUserId: async (
        userId: string,
    ): Promise<Result<PBPresenceStatus, PresenceRepoError>> => {
        return await fromPromise(
            pb
                .collection(DB_TABLES.PRESENCE_STATUS)
                .getFirstListItem<PBPresenceStatus>(
                    `${PRESENCE_FIELDS.USER} = "${userId}"`,
                ),
            (e) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при получении статуса присутствия",
                    e,
                );
            },
        );
    },

    /**
     * Создает новую запись статуса присутствия.
     */
    createPresence: async (
        userId: string,
    ): Promise<Result<PBPresenceStatus, PresenceRepoError>> => {
        return await fromPromise(
            pb.collection(DB_TABLES.PRESENCE_STATUS).create<PBPresenceStatus>({
                user: userId,
                is_online: true,
                last_ping: new Date().toISOString(),
            }),
            (e) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при создании статуса присутствия",
                    e,
                );
            },
        );
    },

    /**
     * Обновляет статус присутствия (Ping/Heartbeat).
     */
    updatePresence: async (
        id: string,
        isOnline: boolean,
    ): Promise<Result<PBPresenceStatus, PresenceRepoError>> => {
        return await fromPromise(
            pb
                .collection(DB_TABLES.PRESENCE_STATUS)
                .update<PBPresenceStatus>(id, {
                    is_online: isOnline,
                    last_ping: new Date().toISOString(),
                }),
            (e) => {
                // Если запись не найдена (например, после logout) — возвращаем как NETWORK_ERROR
                // чтобы heartbeat не ломал UI; вызывающий код игнорирует ошибку heartbeat
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при обновлении статуса присутствия",
                    e,
                );
            },
        );
    },

    /**
     * Обновляет статус печати.
     */
    updateTypingStatus: async (
        id: string,
        isTyping: boolean,
        roomId: string,
    ): Promise<Result<PBPresenceStatus, PresenceRepoError>> => {
        return await fromPromise(
            pb
                .collection(DB_TABLES.PRESENCE_STATUS)
                .update<PBPresenceStatus>(id, {
                    is_typing: isTyping,
                    room_id: isTyping ? roomId : "",
                    last_ping: new Date().toISOString(),
                }),
            (e) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при обновлении статуса печати",
                    e,
                );
            },
        );
    },

    /**
     * Получает список всех статусов присутствия.
     */
    getAllPresence: async (): Promise<
        Result<PBPresenceStatus[], PresenceRepoError>
    > => {
        return await fromPromise(
            pb
                .collection(DB_TABLES.PRESENCE_STATUS)
                .getFullList<PBPresenceStatus>({
                    $autoCancel: false,
                }),
            (e) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при получении всех статусов",
                    e,
                );
            },
        );
    },

    /**
     * Получает список печатающих пользователей в комнате.
     */
    getTypingUsersByRoom: async (
        roomId: string,
        excludeUserId: string,
    ): Promise<Result<PBPresenceStatus[], PresenceRepoError>> => {
        return await fromPromise(
            pb
                .collection(DB_TABLES.PRESENCE_STATUS)
                .getFullList<PBPresenceStatus>({
                    filter: `${PRESENCE_FIELDS.IS_TYPING} = true && ${PRESENCE_FIELDS.ROOM_ID} = "${roomId}" && ${PRESENCE_FIELDS.USER} != "${excludeUserId}"`,
                    expand: PRESENCE_FIELDS.USER,
                }),
            (e) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при получении печатающих пользователей",
                    e,
                );
            },
        );
    },

    /**
     * Подписка на изменения статусов присутствия.
     */
    subscribeToPresence: (
        callback: (event: PBRealtimeEvent<PBPresenceStatus>) => void,
    ) => {
        const unsubscribePromise = pb
            .collection(DB_TABLES.PRESENCE_STATUS)
            .subscribe<PBPresenceStatus>("*", (e) => {
                callback({
                    action: e.action as PBRealtimeAction,
                    record: e.record,
                });
            });

        return () => {
            unsubscribePromise.then((u) => u()).catch(() => {});
        };
    },
};
