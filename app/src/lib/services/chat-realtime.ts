import type { QueryClient } from "@tanstack/react-query";
import {
    KEYSTORE_TYPES,
    QUERY_KEYS,
    REALTIME_ACTIONS,
    USER_FIELDS,
    USER_WEB_STATUS,
} from "@/lib/constants";
import { arrayBufferToBase64, exportPublicKey } from "@/lib/crypto/keys";
import { getKeyPair, hasKeys } from "@/lib/crypto/keystore";
import { logger } from "@/lib/logger";
import { MessageMapper } from "@/lib/repositories/mappers/messageMapper";
import { messageRepository } from "@/lib/repositories/message.repository";
import { presenceRepository } from "@/lib/repositories/presence.repository";
import { roomRepository } from "@/lib/repositories/room.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { MessageService } from "@/lib/services/message";
import type {
    DecryptedMessageWithProfile,
    MessageRecord,
    PBPresenceStatus,
    PBRealtimeEvent,
    RoomMemberRecord,
    UnreadCount,
    UserRecord,
} from "@/lib/types";
import { decryptMessagePayload } from "@/lib/utils/decryptPayload";

// --- Внутреннее состояние (инкапсулировано в файле) ---
let _queryClient: QueryClient | null = null;
let _currentUser: UserRecord | null = null;
let _activeRoomId: string | null = null;
let _activeRoomKey: CryptoKey | null = null;
let _unsubs: Array<() => void> = [];
let _heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let _presenceRecordId: string | null = null;
let _isInitializing = false;
const _lastTypingState = new Map<string, boolean>();

// --- Вспомогательные функции (не экспортируются) ---

function incrementUnreadCount(roomId: string) {
    if (!_queryClient || !_currentUser) {
        return;
    }

    _queryClient.setQueryData<UnreadCount[]>(
        QUERY_KEYS.unreadCounts(_currentUser.id),
        (old = []) => {
            return old.map((c) => {
                if (c.room_id === roomId) {
                    return { ...c, count: (c.count || 0) + 1 };
                }
                return c;
            });
        },
    );
}

function resetUnreadCount(roomId: string) {
    if (!_queryClient || !_currentUser) {
        return;
    }

    _queryClient.setQueryData<UnreadCount[]>(
        QUERY_KEYS.unreadCounts(_currentUser.id),
        (old = []) => {
            return old.map((c) => {
                if (c.room_id === roomId) {
                    return { ...c, count: 0 };
                }
                return c;
            });
        },
    );
}

async function handleMessageEvent(e: PBRealtimeEvent<MessageRecord>) {
    if (!_queryClient || !_currentUser) {
        return;
    }

    const qc = _queryClient;
    const userId = _currentUser.id;
    const record = e.record;

    // 1. При любом новом сообщении инвалидируем список комнат (для последнего сообщения)
    if (e.action === REALTIME_ACTIONS.CREATE) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.rooms(userId) });
        if (record.sender !== userId) {
            incrementUnreadCount(record.room);
        }
    }

    // 2. Если сообщение для активной комнаты — обновляем её кэш
    if (_activeRoomId && record.room === _activeRoomId && _activeRoomKey) {
        if (
            e.action === REALTIME_ACTIONS.CREATE ||
            e.action === REALTIME_ACTIONS.UPDATE
        ) {
            // 1. Используем маппер для подготовки данных для дешифровки
            const row = MessageMapper.toRow(record);
            const decryptedContent = await decryptMessagePayload(
                row,
                _activeRoomKey,
            );

            const mapped: DecryptedMessageWithProfile = {
                ...row,
                content: decryptedContent,
            };
            qc.setQueryData<DecryptedMessageWithProfile[]>(
                QUERY_KEYS.messages(_activeRoomId),
                (old = []) => {
                    if (record.is_deleted && record.sender === userId) {
                        return old.filter((m) => m.id !== record.id);
                    }

                    const deletedByArray = Array.isArray(
                        row.metadata?.deleted_by,
                    )
                        ? row.metadata.deleted_by
                        : [];

                    if (deletedByArray.includes(userId)) {
                        return old.filter((m) => m.id !== row.id);
                    }

                    const idx = old.findIndex((m) => m.id === mapped.id);

                    if (idx > -1) {
                        const next = [...old];
                        next[idx] = { ...old[idx], ...mapped };
                        return next;
                    }

                    return [...old, mapped];
                },
            );

            // Пометка как доставленное
            if (
                record.sender !== _currentUser.id &&
                e.action === REALTIME_ACTIONS.CREATE
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
        } else if (e.action === REALTIME_ACTIONS.DELETE) {
            _queryClient.setQueryData<DecryptedMessageWithProfile[]>(
                QUERY_KEYS.messages(_activeRoomId),
                (old = []) => {
                    return old.filter((m) => {
                        return m.id !== record.id;
                    });
                },
            );
        }
    }
}

async function syncPublicKeys(userId: string) {
    try {
        const keysExist = await hasKeys();
        if (!keysExist) {
            return;
        }

        const identity = await getKeyPair(KEYSTORE_TYPES.IDENTITY);
        const prekey = await getKeyPair(KEYSTORE_TYPES.PREKEY);

        if (!identity || !prekey) {
            return;
        }

        // Экспортируем публичные части в Base64
        const pubX25519 = arrayBufferToBase64(
            await exportPublicKey(prekey.publicKey),
        );
        const pubSigning = arrayBufferToBase64(
            await exportPublicKey(identity.publicKey),
        );

        // Проверяем текущие ключи в БД через репозиторий
        const result = await userRepository.getSecurityKeys(userId);
        if (result.isErr()) {
            logger.error(
                "ChatRealtimeService: Ошибка при получении ключей из профиля",
                result.error,
            );
            return;
        }

        const {
            [USER_FIELDS.PUBLIC_KEY_X25519]: dbX25519,
            [USER_FIELDS.PUBLIC_KEY_SIGNING]: dbSigning,
        } = result.value;

        // Если ключи не совпадают — обновляем через репозиторий
        if (dbX25519 !== pubX25519 || dbSigning !== pubSigning) {
            const updateRes = await userRepository.updateSecurityKeys(
                userId,
                pubX25519,
                pubSigning,
            );

            if (updateRes.isOk()) {
                logger.info(
                    "ChatRealtimeService: Ключи безопасности успешно синхронизированы",
                );
            } else {
                logger.error(
                    "ChatRealtimeService: Ошибка при обновлении ключей в профиле",
                    updateRes.error,
                );
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
    async init(qc: QueryClient, user: UserRecord) {
        // Если сервис уже инициализирован для этого же пользователя или в процессе — выходим
        if (_currentUser?.id === user.id || _isInitializing) {
            return;
        }

        _isInitializing = true;
        try {
            this.destroy();
            _queryClient = qc;
            _currentUser = user;

            // Подготовка Presence
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

            // Подписки
            const unsubMsg = messageRepository.subscribeToMessages((e) => {
                handleMessageEvent(e).catch((err) => {
                    logger.error(
                        "ChatRealtimeService: handleMessageEvent error",
                        err,
                    );
                });
            });
            const unsubMem = roomRepository.subscribeToMemberChanges(
                (e: PBRealtimeEvent<RoomMemberRecord>) => {
                    if (
                        _currentUser &&
                        e.record.user === _currentUser.id &&
                        e.action === REALTIME_ACTIONS.UPDATE
                    ) {
                        resetUnreadCount(e.record.room);
                        _queryClient?.invalidateQueries({
                            queryKey: QUERY_KEYS.rooms(_currentUser.id),
                        });
                    }
                },
            );
            const unsubPresence = presenceRepository.subscribeToPresence(
                (e: PBRealtimeEvent<PBPresenceStatus>) => {
                    if (!_queryClient) {
                        return;
                    }

                    const record = e.record;
                    const userId = record.user;

                    // 1. Оптимистичное обновление Presence Map
                    _queryClient.setQueryData<Record<string, string>>(
                        QUERY_KEYS.presence(),
                        (old = {}) => {
                            const lastPingTime = new Date(
                                record.last_ping,
                            ).getTime();
                            const isStale = Date.now() - lastPingTime > 60000;
                            const status =
                                record.is_online && !isStale
                                    ? USER_WEB_STATUS.ONLINE
                                    : USER_WEB_STATUS.OFFLINE;
                            return { ...old, [userId]: status };
                        },
                    );

                    // 2. Инвалидируем typing только если статус РЕАЛЬНО изменился (убирает шум heartbeat)
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

            _unsubs.push(unsubMsg, unsubMem, unsubPresence);

            // Запуск фоновой синхронизации ключей
            syncPublicKeys(user.id).catch((err) => {
                logger.error(
                    "ChatRealtimeService: Непредвиденная ошибка при запуске синхронизации",
                    err,
                );
            });

            // Heartbeat: обновляем статус каждые 20 секунд.
            // При ошибке (например, запись удалена после logout) — сбрасываем ID,
            // чтобы предотвратить бесконечный PATCH-спам на несуществующую запись.
            _heartbeatInterval = setInterval(async () => {
                if (!_presenceRecordId) {
                    return;
                }
                const res = await presenceRepository.updatePresence(
                    _presenceRecordId,
                    true,
                );
                if (res.isErr()) {
                    logger.warn(
                        "ChatRealtimeService: Heartbeat ошибка, сброс presence ID.",
                    );
                    _presenceRecordId = null;
                }
            }, 20000);

            logger.info("ChatRealtimeService: Инициализирован");
        } finally {
            _isInitializing = false;
        }
    },

    setActiveRoom(id: string, key: CryptoKey) {
        _activeRoomId = id;
        _activeRoomKey = key;
    },

    clearActiveRoom() {
        _activeRoomId = null;
        _activeRoomKey = null;
    },

    async setTypingStatus(roomId: string, isTyping: boolean) {
        if (_presenceRecordId) {
            await presenceRepository.updateTypingStatus(
                _presenceRecordId,
                isTyping,
                roomId,
            );
        }
    },

    destroy() {
        _unsubs.forEach((u) => {
            u();
        });
        _unsubs = [];
        if (_heartbeatInterval) {
            clearInterval(_heartbeatInterval);
        }
        _heartbeatInterval = null;
        _activeRoomId = null;
        _activeRoomKey = null;
        _presenceRecordId = null;
        _currentUser = null;
        _queryClient = null;
        _isInitializing = false;
        _lastTypingState.clear();
    },
};
