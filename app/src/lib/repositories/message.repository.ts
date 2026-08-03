import {
    DB_TABLES,
    ERROR_CODES,
    MESSAGE_FIELDS,
    ROOM_MEMBER_FIELDS,
} from "../constants";
import { pb } from "../pocketbase";
import { chatHistoryDb } from "../services/chat-history-db";
import { realtimeGateway } from "../services/RealtimeGateway";
import type {
    MessageRepoError,
    MessageRow,
    PBMessage,
    PBRealtimeAction,
    PBRealtimeEvent,
    Result,
    UnreadCount,
} from "../types";
import { appError, err, fromPromise, ok } from "../utils/result";
import { MessageMapper } from "./mappers/messageMapper";

/**
 * FUNCTIONAL MESSAGE REPOSITORY
 * Управляет сообщениями и медиа-вложениями в чате (V2+).
 */

export const messageRepository = {
    /**
     * Получить сообщение по ID
     */
    getMessageById: async (
        messageId: string,
    ): Promise<Result<MessageRow, MessageRepoError>> => {
        // В V2+ данные отправителя денормализованы, expand не нужен
        return fromPromise(
            pb.collection(DB_TABLES.MESSAGES).getOne<PBMessage>(messageId),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NOT_FOUND_ERROR,
                    `Сообщение с ID ${messageId} не найдено`,
                    e,
                );
            },
        ).map((record) => MessageMapper.toRow(record));
    },

    /**
     * Получить последние сообщения комнаты (пагинация)
     */
    getRoomMessages: async (
        roomId: string,
        page = 1,
        perPage = 50,
    ): Promise<Result<MessageRow[], MessageRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.MESSAGES)
                .getList<PBMessage>(page, perPage, {
                    filter: pb.filter(`${MESSAGE_FIELDS.ROOM} = {:roomId}`, {
                        roomId,
                    }),
                    sort: `-${MESSAGE_FIELDS.CREATED}`,
                    $autoCancel: false,
                }),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось загрузить историю сообщений",
                    e,
                );
            },
        ).map((res) => res.items.map((item) => MessageMapper.toRow(item)));
    },

    /**
     * Получить историю сообщений из локальной БД
     */
    getLocalRoomMessages: async (
        roomId: string,
        userId: string,
    ): Promise<Result<MessageRow[], MessageRepoError>> => {
        return fromPromise(
            chatHistoryDb.getRoomMessages(userId, roomId),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.DB_ERROR,
                    "Ошибка при чтении из локальной БД",
                    e,
                );
            },
        ).map((messages) => {
            // chatHistoryDb.getRoomMessages возвращает уже отсортированные по created данные
            // но на всякий случай можно оставить как есть
            return messages.sort((a, b) => {
                return (
                    new Date(b.created).getTime() -
                    new Date(a.created).getTime()
                );
            });
        });
    },

    /**
     * Сохранить список сообщений в локальную БД
     */
    saveLocalMessages: async (
        userId: string,
        messages: MessageRow[],
    ): Promise<Result<void, MessageRepoError>> => {
        return fromPromise(
            chatHistoryDb.addBatch(userId, messages),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.DB_ERROR,
                    "Ошибка при сохранении в локальную БД",
                    e,
                );
            },
        );
    },

    /**
     * Сохранить одно сообщение в локальную БД
     */
    putLocalMessage: async (
        userId: string,
        message: MessageRow,
    ): Promise<Result<void, MessageRepoError>> => {
        return fromPromise(
            chatHistoryDb.putMessage(userId, message),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.DB_ERROR,
                    "Ошибка при сохранении сообщения в локальную БД",
                    e,
                );
            },
        );
    },

    /**
     * Удалить сообщение из локальной БД
     */
    deleteLocalMessage: async (
        userId: string,
        messageId: string,
    ): Promise<Result<void, MessageRepoError>> => {
        return fromPromise(
            chatHistoryDb.removeMessage(userId, messageId),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.DB_ERROR,
                    "Ошибка при удалении сообщения из локальной БД",
                    e,
                );
            },
        );
    },

    /**
     * Получить ID комнат, в которых есть избранные сообщения для пользователя
     */
    getStarredRoomIds: async (
        userId: string,
    ): Promise<Result<string[], MessageRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.MESSAGES).getFullList<PBMessage>({
                filter: pb.filter(
                    `${MESSAGE_FIELDS.IS_STARRED} = true && ${MESSAGE_FIELDS.SENDER} = {:userId}`,
                    { userId },
                ),
                fields: MESSAGE_FIELDS.ROOM,
                $autoCancel: false,
            }),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось загрузить избранные сообщения",
                    e,
                );
            },
        ).map((res) => [...new Set(res.map((r) => r.room))]);
    },

    /**
     * Получить последнее сообщение по ID
     */
    getLatestVisibleMessage: async (
        roomId: string,
        userId: string,
    ): Promise<Result<MessageRow | null, MessageRepoError>> => {
        return fromPromise(
            pb.collection(DB_TABLES.MESSAGES).getList<PBMessage>(1, 10, {
                filter: pb.filter(
                    `${MESSAGE_FIELDS.ROOM} = {:roomId} && ${MESSAGE_FIELDS.IS_DELETED} = false`,
                    { roomId },
                ),
                sort: `-${MESSAGE_FIELDS.CREATED}`,
                $autoCancel: false,
            }),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось получить последнее сообщение",
                    e,
                );
            },
        ).map((res) => {
            // Ищем первое сообщение, которое не скрыто текущим пользователем
            const visibleMsg = res.items.find((m) => {
                const metadataObj =
                    typeof m.metadata === "object" && m.metadata !== null
                        ? m.metadata
                        : {};

                const rawDeletedBy =
                    "deleted_by" in metadataObj
                        ? metadataObj.deleted_by
                        : undefined;

                const deletedBy = Array.isArray(rawDeletedBy)
                    ? rawDeletedBy
                    : [];
                return !deletedBy.includes(userId);
            });
            return visibleMsg ? MessageMapper.toRow(visibleMsg) : null;
        });
    },

    /**
     * Получить последнее видимое сообщение для списка комнат (пакетный режим).
     */
    getLastVisibleMessageBatch: async (
        roomIds: string[],
        userId: string,
    ): Promise<Result<Map<string, MessageRow>, MessageRepoError>> => {
        if (roomIds.length === 0) {
            return ok(new Map());
        }

        const entries = await Promise.all(
            roomIds.map(async (roomId) => {
                const result = await messageRepository.getLatestVisibleMessage(
                    roomId,
                    userId,
                );
                const msg = result.isOk() ? result.value : null;
                return [roomId, msg] as const;
            }),
        );

        const map = new Map<string, MessageRow>(
            entries.filter((e): e is [string, MessageRow] => e[1] !== null),
        );
        return ok(map);
    },

    /**
     * Отправить сообщение
     */
    sendMessage: async (
        data: Partial<MessageRow>,
    ): Promise<Result<MessageRow, MessageRepoError>> => {
        const pbData = MessageMapper.toCreateRecord(data);

        return fromPromise(
            pb.collection(DB_TABLES.MESSAGES).create<PBMessage>(pbData),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.VALIDATION_ERROR,
                    "Ошибка при отправке сообщения",
                    e,
                );
            },
        ).map((record) => MessageMapper.toRow(record));
    },

    /**
     * Обновить поля сообщения
     */
    updateMessage: async (
        messageId: string,
        data: Partial<MessageRow>,
    ): Promise<Result<MessageRow, MessageRepoError>> => {
        const pbData = MessageMapper.toUpdateRecord(data);

        return fromPromise(
            pb
                .collection(DB_TABLES.MESSAGES)
                .update<PBMessage>(messageId, pbData),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось обновить сообщение",
                    e,
                );
            },
        ).map((record) => MessageMapper.toRow(record));
    },

    /**
     * Редактировать сообщение (упрощенная обертка)
     */
    editMessage: async (
        messageId: string,
        content: string,
        iv?: string,
    ): Promise<Result<MessageRow, MessageRepoError>> => {
        return messageRepository.updateMessage(messageId, {
            content,
            iv,
            is_edited: true,
        });
    },

    /**
     * Физическое удаление сообщения (Hard Delete).
     * Полностью удаляет запись из базы данных без следов.
     */
    hardDeleteMessage: async (
        messageId: string,
    ): Promise<Result<void, MessageRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.MESSAGES)
                .delete(messageId)
                .then(() => {}),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось удалить сообщение физически",
                    e,
                );
            },
        );
    },

    /**
     * Удаление сообщения (Soft Delete).
     * Помечает сообщение как удаленное и очищает контент для приватности.
     */
    deleteMessage: async (
        messageId: string,
    ): Promise<Result<MessageRow, MessageRepoError>> => {
        return messageRepository.updateMessage(messageId, {
            [MESSAGE_FIELDS.IS_DELETED]: true,
            [MESSAGE_FIELDS.CONTENT]: "",
            [MESSAGE_FIELDS.IV]: "",
            [MESSAGE_FIELDS.ATTACHMENTS]: [],
        });
    },

    /**
     * Подписка на изменения в коллекции сообщений (messages).
     */
    subscribeToMessages: (
        callback: (event: PBRealtimeEvent<PBMessage>) => void,
    ): (() => void) => {
        let unsub: (() => void) | undefined;
        realtimeGateway
            .subscribe<PBMessage>(DB_TABLES.MESSAGES, (e) => {
                callback({
                    action: e.action as PBRealtimeAction,
                    record: e.record,
                });
            })
            .then((unsubscribeFn) => {
                unsub = unsubscribeFn;
            })
            .catch(() => {});

        return () => {
            if (unsub) {
                unsub();
            }
        };
    },

    /**
     * Очистить комнату (пометить все сообщения как удаленные)
     */
    clearRoom: async (
        roomId: string,
        userId: string,
    ): Promise<Result<void, MessageRepoError>> => {
        try {
            const filter = pb.filter(`${MESSAGE_FIELDS.ROOM} = {:roomId}`, {
                roomId,
            });
            const records = await pb
                .collection(DB_TABLES.MESSAGES)
                .getFullList({
                    filter,
                    fields: `${MESSAGE_FIELDS.ID},metadata`,
                    $autoCancel: false,
                });

            if (records.length === 0) {
                return ok(undefined);
            }

            const batch = pb.createBatch();

            for (const r of records) {
                const metadataObj =
                    typeof r.metadata === "object" && r.metadata !== null
                        ? r.metadata
                        : {};

                const rawDeletedBy =
                    "deleted_by" in metadataObj
                        ? metadataObj.deleted_by
                        : undefined;

                const deletedBy = Array.isArray(rawDeletedBy)
                    ? rawDeletedBy.filter(
                          (item): item is string => typeof item === "string",
                      )
                    : [];

                if (!deletedBy.includes(userId)) {
                    deletedBy.push(userId);
                }
                // Используем Soft Delete вместо физического удаления
                batch.collection(DB_TABLES.MESSAGES).update(r.id, {
                    metadata: {
                        ...metadataObj,
                        deleted_by: deletedBy,
                    },
                });
            }

            await batch.send();

            return ok(undefined);
        } catch (e) {
            return err(
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось очистить комнату",
                    e,
                ),
            );
        }
    },

    /**
     * Пометить все сообщения как прочитанные
     */
    markMessagesAsRead: async ({
        roomId,
        currentUserId: _currentUserId,
    }: {
        roomId: string;
        currentUserId: string;
    }): Promise<Result<void, MessageRepoError>> => {
        try {
            // Вызываем серверный эндпоинт, который обновит статус через SQL
            // Это решает проблему 400 Bad Request при Batch update и ускоряет работу
            await pb.send(`/api/custom/rooms/${roomId}/read`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            return ok(undefined);
        } catch (e) {
            console.error(
                `[DB_DEBUG_ERROR] markMessagesAsRead: Сбой выполнения:`,
                e,
            );
            return err(
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Не удалось пометить сообщения как прочитанные",
                    e,
                ),
            );
        }
    },

    /**
     * Получить количество непрочитанных сообщений в комнате
     * Оптимизировано для V2+: берем напрямую из room_members
     */
    getUnreadCount: async (
        roomId: string,
        userId: string,
    ): Promise<Result<number, MessageRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.ROOM_MEMBERS)
                .getFirstListItem(
                    pb.filter(
                        `${ROOM_MEMBER_FIELDS.ROOM} = {:roomId} && ${ROOM_MEMBER_FIELDS.USER} = {:userId}`,
                        { roomId, userId },
                    ),
                    {
                        fields: ROOM_MEMBER_FIELDS.UNREAD_COUNT,
                        $autoCancel: false,
                    },
                ),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при подсчете непрочитанных",
                    e,
                );
            },
        ).map((res) => (res[ROOM_MEMBER_FIELDS.UNREAD_COUNT] as number) || 0);
    },

    /**
     * Получить количество непрочитанных сообщений для списка комнат (пакетный режим)
     * Оптимизировано для V2+: получаем данные напрямую из room_members за один запрос
     */
    getUnreadCountsBatch: async ({
        roomIds,
        userId,
    }: {
        roomIds: string[];
        userId: string;
    }): Promise<Result<UnreadCount[], MessageRepoError>> => {
        if (roomIds.length === 0) {
            return ok([]);
        }

        return fromPromise(
            pb.collection(DB_TABLES.ROOM_MEMBERS).getFullList({
                filter: pb.filter(`${ROOM_MEMBER_FIELDS.USER} = {:userId}`, {
                    userId,
                }),
                fields: `${ROOM_MEMBER_FIELDS.ROOM},${ROOM_MEMBER_FIELDS.UNREAD_COUNT}`,
                $autoCancel: false,
            }),
            (e: unknown) =>
                appError(
                    ERROR_CODES.NETWORK_ERROR,
                    "Ошибка при пакетном получении непрочитанных из room_members",
                    e,
                ),
        ).map((records) => {
            return records
                .filter((r) => roomIds.includes(r[ROOM_MEMBER_FIELDS.ROOM]))
                .map((r) => ({
                    room: r[ROOM_MEMBER_FIELDS.ROOM] as string,
                    count: (r[ROOM_MEMBER_FIELDS.UNREAD_COUNT] as number) || 0,
                }));
        });
    },
};
