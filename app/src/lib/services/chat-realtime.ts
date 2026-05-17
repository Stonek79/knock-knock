import type { QueryClient } from "@tanstack/react-query";
import {
    KEYSTORE_TYPES,
    QUERY_KEYS,
    REALTIME_ACTIONS,
    USER_FIELDS,
    USER_WEB_STATUS,
} from "../constants";
import { arrayBufferToBase64, exportPublicKey } from "../crypto/keys";
import { getKeyPair, hasKeys } from "../crypto/keystore";
import { logger } from "../logger";
import { MessageMapper } from "../repositories/mappers/messageMapper";
import { messageRepository } from "../repositories/message.repository";
import { presenceRepository } from "../repositories/presence.repository";
import { roomRepository } from "../repositories/room.repository";
import { userRepository } from "../repositories/user.repository";
import type {
    ChatMessage,
    MessageRow,
    PBPresenceStatus,
    PBRealtimeAction,
    PBRealtimeEvent,
    RoomWithMembers,
    UnreadCount,
    UserRecord,
} from "../types";
import { ensureISODate } from "../utils/date";
import { decryptMessagePayload } from "../utils/decryptPayload";
import { chatCryptoService } from "./chat-crypto";
import { MessageService } from "./message";

// --- Внутреннее состояние (инкапсулировано в файле) ---
let _queryClient: QueryClient | null = null;
let _currentUser: UserRecord | null = null;
let _activeRoomId: string | null = null;
let _unsubs: Array<() => void> = [];
let _heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let _presenceRecordId: string | null = null;
let _isInitializing = false;
const _lastTypingState = new Map<string, boolean>();

// --- Вспомогательные функции (не экспортируются) ---

function incrementUnreadCount({ roomId }: { roomId: string }) {
    if (!_queryClient || !_currentUser) {
        return;
    }

    _queryClient.setQueryData<UnreadCount[]>(
        QUERY_KEYS.unreadCounts(_currentUser.id),
        (old = []) => {
            return old.map((c) => {
                if (c.room === roomId) {
                    return { ...c, count: (c.count || 0) + 1 };
                }
                return c;
            });
        },
    );
}

function resetUnreadCount({ roomId }: { roomId: string }) {
    if (!_queryClient || !_currentUser) {
        return;
    }

    _queryClient.setQueryData<UnreadCount[]>(
        QUERY_KEYS.unreadCounts(_currentUser.id),
        (old = []) => {
            return old.map((c) => {
                if (c.room === roomId) {
                    return { ...c, count: 0 };
                }
                return c;
            });
        },
    );
}

async function handleMessageEvent({
    event,
}: {
    event: { action: PBRealtimeAction; record: MessageRow };
}) {
    if (!_queryClient || !_currentUser) {
        return;
    }

    const record = event.record;
    const qc = _queryClient;
    const userId = _currentUser.id;

    // 1. Расшифровываем сообщение на лету (нужно и для чата, и для превью в списке комнат)
    let decryptedContent = "";
    if (
        event.action === REALTIME_ACTIONS.CREATE ||
        event.action === REALTIME_ACTIONS.UPDATE
    ) {
        const roomKey = await chatCryptoService.getRoomKey({
            roomId: record.room,
            userId,
        });

        try {
            decryptedContent =
                (await decryptMessagePayload(record, roomKey || undefined)) ||
                "";
        } catch (e) {
            logger.error("ChatRealtimeService: Ошибка дешифровки сообщения", e);
            decryptedContent = "Ошибка дешифровки";
        }
    }

    const mapped: ChatMessage = {
        ...record,
        content: decryptedContent || "",
    };

    // 2. Хирургическое обновление списка чатов (Сайдбар) БЕЗ запросов к серверу
    if (event.action === REALTIME_ACTIONS.CREATE) {
        if (record.sender !== userId) {
            incrementUnreadCount({ roomId: record.room });
        }

        qc.setQueryData<RoomWithMembers[]>(
            QUERY_KEYS.rooms(userId),
            (old = []) => {
                return old.map((room) => {
                    if (room.id === record.room) {
                        const me = room.room_members?.find(
                            (m) => m.user_id === userId,
                        );
                        const isOwn = record.sender === userId;
                        const newUnread = !isOwn
                            ? (me?.unread_count || 0) + 1
                            : me?.unread_count || 0;

                        const newMembers =
                            room.room_members?.map((m) =>
                                m.user_id === userId
                                    ? { ...m, unread_count: newUnread }
                                    : m,
                            ) || [];

                        return {
                            ...room,
                            last_message: mapped,
                            room_members: newMembers,
                        };
                    }
                    return room;
                });
            },
        );
    } else if (event.action === REALTIME_ACTIONS.UPDATE) {
        qc.setQueryData<RoomWithMembers[]>(
            QUERY_KEYS.rooms(userId),
            (old = []) => {
                return old.map((room) => {
                    if (
                        room.id === record.room &&
                        room.last_message?.id === record.id
                    ) {
                        return { ...room, last_message: mapped };
                    }
                    return room;
                });
            },
        );
    }

    if (event.action === REALTIME_ACTIONS.CREATE) {
        if (record.sender !== userId) {
            incrementUnreadCount({ roomId: record.room });
        }
    }

    // 3. Обновляем окно самого чата, если оно сейчас открыто
    if (_activeRoomId && record.room === _activeRoomId) {
        if (event.action === REALTIME_ACTIONS.DELETE) {
            _queryClient.setQueryData<ChatMessage[]>(
                QUERY_KEYS.messages(_activeRoomId),
                (old = []) => old.filter((m) => m.id !== record.id),
            );

            // Если удалили последнее сообщение — дергаем сервер за списком, так как локально мы не знаем предыдущего
            const rooms =
                qc.getQueryData<RoomWithMembers[]>(QUERY_KEYS.rooms(userId)) ||
                [];
            const room = rooms.find((r) => r.id === record.room);
            if (room && room.last_message?.id === record.id) {
                setTimeout(
                    () =>
                        qc.invalidateQueries({
                            queryKey: QUERY_KEYS.rooms(userId),
                        }),
                    10,
                );
            }

            return; // Быстрый выход, ключи для удаления не нужны
        }

        if (
            event.action === REALTIME_ACTIONS.CREATE ||
            event.action === REALTIME_ACTIONS.UPDATE
        ) {
            qc.setQueryData<ChatMessage[]>(
                QUERY_KEYS.messages(_activeRoomId),
                (old = []) => {
                    const deletedBy = Array.isArray(record.metadata?.deleted_by)
                        ? record.metadata.deleted_by
                        : [];

                    if (deletedBy.includes(userId) || record.is_deleted) {
                        return old.filter((m) => m.id !== record.id);
                    }

                    const idx = old.findIndex((m) => m.id === mapped.id);

                    if (idx > -1) {
                        const next = [...old];
                        next[idx] = { ...old[idx], ...mapped };
                        return next;
                    }

                    if (
                        event.action === REALTIME_ACTIONS.CREATE &&
                        record.sender === userId
                    ) {
                        const withoutOptimistic = (old as ChatMessage[]).filter(
                            (m) => !(m._tempId && m.sender === userId),
                        );
                        return [...withoutOptimistic, mapped];
                    }

                    return [...old, mapped];
                },
            );

            if (
                record.sender !== _currentUser.id &&
                event.action === REALTIME_ACTIONS.CREATE
            ) {
                MessageService.markMessageAsDelivered(record.id).catch(
                    (err) => {
                        logger.error(
                            "ChatRealtimeService: Ошибка при пометке сообщения как доставленного",
                            err,
                        );
                    },
                );
            }
        }
    }
}

async function syncPublicKeys({ userId }: { userId: string }) {
    try {
        const keysExist = await hasKeys();
        if (!keysExist) {
            return;
        }

        const identity = await getKeyPair(KEYSTORE_TYPES.IDENTITY);
        if (!identity) {
            return;
        }

        const publicKeyBase64 = arrayBufferToBase64(
            await exportPublicKey(identity.publicKey),
        );

        const keysRes = await userRepository.getSecurityKeys(userId);
        if (keysRes.isOk()) {
            const keys = keysRes.value;
            if (!keys[USER_FIELDS.PUBLIC_KEY_X25519]) {
                logger.info(
                    "ChatRealtimeService: Публичный ключ отсутствует в профиле, синхронизируем...",
                );
                await userRepository.updateSecurityKeys({
                    userId,
                    x25519: publicKeyBase64,
                    signing: keys[USER_FIELDS.PUBLIC_KEY_SIGNING] || "",
                });
            }
        }
    } catch (error) {
        logger.error(
            "ChatRealtimeService: Системная ошибка при синхронизации ключей",
            error,
        );
    }
}

// --- Публичный API сервиса ---

export const ChatRealtimeService = {
    async init({ qc, user }: { qc: QueryClient; user: UserRecord }) {
        if (_currentUser?.id === user.id || _isInitializing) {
            return;
        }

        _isInitializing = true;
        try {
            _queryClient = qc;
            _currentUser = user;

            const unsubMsg = messageRepository.subscribeToMessages((event) => {
                try {
                    const mappedEvent = {
                        action: event.action,
                        record: MessageMapper.toRow(event.record),
                    };
                    handleMessageEvent({ event: mappedEvent }).catch(
                        (error) => {
                            logger.error(
                                "ChatRealtimeService: Асинхронная ошибка handleMessageEvent",
                                error,
                            );
                        },
                    );
                } catch (e) {
                    logger.error(
                        "ChatRealtimeService: Синхронная ошибка маппинга сообщения",
                        e,
                    );
                }
            });

            const unsubMem = roomRepository.subscribeToMemberChanges((e) => {
                if (
                    _currentUser &&
                    e.record.user === _currentUser.id &&
                    e.action === REALTIME_ACTIONS.UPDATE
                ) {
                    resetUnreadCount({ roomId: e.record.room });
                    _queryClient?.invalidateQueries({
                        queryKey: QUERY_KEYS.rooms(_currentUser.id),
                    });
                }
            });

            // Подписка на изменения в коллекции rooms (метаданные: имя, аватар и т.д.)
            const unsubRooms = roomRepository.subscribeToRooms(() => {
                if (!_queryClient || !_currentUser) {
                    return;
                }
                _queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.rooms(_currentUser.id),
                });
            });

            const unsubPresence = presenceRepository.subscribeToPresence(
                (e: PBRealtimeEvent<PBPresenceStatus>) => {
                    if (!_queryClient) {
                        return;
                    }

                    const record = e.record;
                    const userId = record.user;

                    _queryClient.setQueryData<Record<string, string>>(
                        QUERY_KEYS.presence(),
                        (old = {}) => {
                            const lastPingTime = new Date(
                                ensureISODate(record.last_ping || ""),
                            ).getTime();
                            const isStale = Date.now() - lastPingTime > 60000;
                            const status =
                                record.is_online && !isStale
                                    ? USER_WEB_STATUS.ONLINE
                                    : USER_WEB_STATUS.OFFLINE;
                            return { ...old, [userId]: status };
                        },
                    );

                    if (record.room_id) {
                        const wasTyping = _lastTypingState.get(userId) || false;
                        const isTyping = record.is_typing;

                        if (wasTyping !== isTyping) {
                            _lastTypingState.set(userId, isTyping);
                            _queryClient.invalidateQueries({
                                queryKey: QUERY_KEYS.typing(record.room_id),
                            });
                        }
                    }
                },
            );

            _unsubs.push(unsubMsg, unsubMem, unsubRooms, unsubPresence);

            // --- 2. АСИНХРОННЫЕ ОПЕРАЦИИ (Presence и Ключи) ---
            const res = await presenceRepository.getPresenceByUserId(user.id);
            if (res.isOk()) {
                _presenceRecordId = res.value.id;
                await presenceRepository.updatePresence(
                    _presenceRecordId,
                    true,
                );
            } else {
                const createRes = await presenceRepository.createPresence(
                    user.id,
                );
                if (createRes.isOk()) {
                    _presenceRecordId = createRes.value.id;
                }
            }

            syncPublicKeys({ userId: user.id }).catch((err) => {
                logger.error(
                    "ChatRealtimeService: Непредвиденная ошибка при запуске синхронизации",
                    err,
                );
            });

            _heartbeatInterval = setInterval(async () => {
                if (!_presenceRecordId) {
                    return;
                }
                const hbRes = await presenceRepository.updatePresence(
                    _presenceRecordId,
                    true,
                );
                if (hbRes.isErr()) {
                    logger.warn(
                        "ChatRealtimeService: Heartbeat ошибка, сброс presence ID.",
                    );
                    _presenceRecordId = null;
                }
            }, 60000);
        } finally {
            _isInitializing = false;
        }
    },

    setActiveRoom({ id, key }: { id: string; key: CryptoKey }) {
        _activeRoomId = id;
        chatCryptoService.setRoomKey({ roomId: id, key });
    },

    clearActiveRoom() {
        _activeRoomId = null;
    },

    async setTypingStatus({
        roomId,
        isTyping,
    }: {
        roomId: string;
        isTyping: boolean;
    }) {
        if (_presenceRecordId) {
            await presenceRepository.updateTypingStatus(
                _presenceRecordId,
                isTyping,
                roomId,
            );
        }
    },

    destroy() {
        chatCryptoService.clearCache();
        _unsubs.forEach((u) => {
            u();
        });
        _unsubs = [];
        if (_heartbeatInterval) {
            clearInterval(_heartbeatInterval);
        }
        _heartbeatInterval = null;
        _activeRoomId = null;
        _presenceRecordId = null;
        _currentUser = null;
        _queryClient = null;
        _isInitializing = false;
        _lastTypingState.clear();
    },
};
