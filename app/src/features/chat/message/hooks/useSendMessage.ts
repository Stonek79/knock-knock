import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import { CLIENT_MESSAGE_STATUS, QUERY_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { type OutboxMessage, outboxDb } from "@/lib/mediadb/media-db";
import { pb } from "@/lib/pocketbase";
import { SealedSenderUtil } from "@/lib/services/chat-crypto";
import { MessageService } from "@/lib/services/message";
import type {
    Attachment,
    ChatMessage,
    Profile,
    RoomWithMembers,
} from "@/lib/types";
import { createOptimisticMessage } from "../utils/optimistic";
import {
    generateOptimisticAttachments,
    uploadMessageMedia,
} from "../utils/upload";

/**
 * Параметры инициализации хука useSendMessage
 */
type UseSendMessageOptions = {
    /** ID текущей комнаты (опционален для безусловного вызова хука) */
    roomId?: string;
    /** Ключ шифрования комнаты (AES-GCM) */
    roomKey?: CryptoKey;
    /** Профиль текущего пользователя */
    user?: Profile | null;
};

/**
 * Переменные мутации (передаются в mutate())
 */
type SendMessageVariables = {
    /** Текст сообщения */
    text: string;
    /** Прикреплённые файлы (фото, видео, документы) */
    files?: File[];
    /** Голосовое сообщение (аудио blob) */
    audioBlob?: Blob;
    /** ID цитируемого сообщения */
    replyToId?: string | null;
    /** Имя оригинального автора (для пересылки) */
    forwardFromName?: string;
    /** ID оригинального автора (для пересылки) */
    forwardFromId?: string;
    /** Видео-сообщение (видеокружочек blob) */
    videoBlob?: Blob;
    /** Флаг, является ли это видеокружочком */
    isVideoMessage?: boolean;
};

/**
 * Контекст оптимистичной мутации (возвращается из onMutate для rollback)
 */
type SendMessageContext = {
    /** Снимок кэша сообщений до оптимистичного обновления */
    previousMessages: ChatMessage[];
    /** Временный ID оптимистичного сообщения */
    tempId: string;
    /** Blob URLs для очистки */
    blobUrls: string[];
};

/**
 * Хук оптимистичной отправки сообщений.
 */
export function useSendMessage({
    roomId,
    roomKey,
    user,
}: UseSendMessageOptions) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const { t } = useTranslation();

    const mutation = useMutation<
        { serverId: string; serverAttachments: Attachment[] | null },
        Error,
        SendMessageVariables,
        SendMessageContext
    >({
        /**
         * Основная функция отправки: загрузка медиа + шифрование + отправка.
         */
        mutationFn: async ({
            text,
            files,
            audioBlob,
            videoBlob,
            replyToId,
            forwardFromName,
            forwardFromId,
            isVideoMessage,
        }) => {
            if (!roomId || !roomKey || !user) {
                throw new Error(
                    "Невозможно отправить: параметры не инициализированы",
                );
            }

            if (!navigator.onLine) {
                const fileBuffers = files
                    ? await Promise.all(files.map((f) => f.arrayBuffer()))
                    : undefined;
                const fileNames = files?.map((f) => f.name);
                const fileTypes = files?.map((f) => f.type);
                const audioBuffer = audioBlob
                    ? await audioBlob.arrayBuffer()
                    : undefined;
                const videoBuffer = videoBlob
                    ? await videoBlob.arrayBuffer()
                    : undefined;

                const outboxMsg: OutboxMessage = {
                    id: crypto.randomUUID(),
                    roomId,
                    userId: user.id,
                    token: pb.authStore.token,
                    payload: {
                        text,
                        files: fileBuffers,
                        fileNames,
                        fileTypes,
                        audioBlob: audioBuffer,
                        videoBlob: videoBuffer,
                        replyToId: replyToId ?? undefined,
                        forwardFromName,
                        forwardFromId,
                        isVideoMessage,
                    },
                    timestamp: Date.now(),
                    status: "pending",
                    retryCount: 0,
                };

                await outboxDb.add(user.id, outboxMsg);

                try {
                    if (
                        "serviceWorker" in navigator &&
                        "SyncManager" in window
                    ) {
                        const reg = await navigator.serviceWorker.ready;
                        // @ts-expect-error - SyncManager types are missing in some setups
                        await reg.sync.register("sync-outbox");
                    }
                } catch (e) {
                    logger.error("Failed to register sync-outbox", e);
                }

                return { serverId: outboxMsg.id, serverAttachments: null };
            }

            // 1. Загружаем медиа через единый сервис оркестрации
            const attachments = await uploadMessageMedia({
                audioBlob,
                videoBlob,
                files,
                userId: user.id,
                roomId,
                cryptoKey: roomKey,
            });

            // 2. Шифруем и отправляем на сервер
            const result = await MessageService.sendMessage({
                roomId,
                senderId: user.id,
                content: SealedSenderUtil.pack(text, user.id),
                roomKey,
                attachments: attachments.length > 0 ? attachments : undefined,
                metadata: {
                    reply_to_id: replyToId ?? undefined,
                    forward_from_name: forwardFromName,
                    forward_from_id: forwardFromId,
                    is_video_message: isVideoMessage,
                },
            });

            if (result.isErr()) {
                throw new Error(result.error.message);
            }

            return {
                serverId: result.value,
                serverAttachments: attachments.length > 0 ? attachments : null,
            };
        },

        /**
         * Optimistic update
         */
        onMutate: async (variables) => {
            if (!roomId || !roomKey || !user) {
                return { previousMessages: [], tempId: "", blobUrls: [] };
            }

            await queryClient.cancelQueries({
                queryKey: QUERY_KEYS.messages(roomId),
            });

            const previousMessages =
                queryClient.getQueryData<ChatMessage[]>(
                    QUERY_KEYS.messages(roomId),
                ) ?? [];

            const tempId = crypto.randomUUID();

            const { attachments: optimisticAttachments, blobUrls } =
                generateOptimisticAttachments({
                    tempId,
                    audioBlob: variables.audioBlob,
                    videoBlob: variables.videoBlob,
                    files: variables.files,
                });

            // Создаем единый объект оптимистичного сообщения с полной метадатой
            const optimisticMsg: ChatMessage = {
                ...createOptimisticMessage({
                    tempId,
                    text: variables.text,
                    senderId: user.id,
                    senderName: user.display_name,
                    senderAvatar: user.avatar_url || "",
                    roomId,
                    attachments:
                        optimisticAttachments.length > 0
                            ? optimisticAttachments
                            : undefined,
                    blobUrls,
                }),
                metadata: {
                    deleted_by: [],
                    reply_to_id: variables.replyToId ?? undefined,
                    forward_from_name: variables.forwardFromName,
                    forward_from_id: variables.forwardFromId,
                    is_video_message: variables.isVideoMessage,
                },
                _retryFiles: variables.files,
                _retryAudioBlob: variables.audioBlob,
                _retryVideoBlob: variables.videoBlob,
                _isVideoMessage: variables.isVideoMessage,
            };

            queryClient.setQueryData<ChatMessage[]>(
                QUERY_KEYS.messages(roomId),
                (old = []) => [...old, optimisticMsg],
            );

            // --- Оптимистичное обновление списка чатов ---
            queryClient.setQueryData<RoomWithMembers[]>(
                QUERY_KEYS.rooms(user.id),
                (old = []) => {
                    return old.map((room) => {
                        if (room.id === roomId) {
                            return {
                                ...room,
                                last_message: optimisticMsg,
                            };
                        }
                        return room;
                    });
                },
            );

            return { previousMessages, tempId, blobUrls };
        },

        /**
         * Успешная отправка
         */
        onSuccess: (data, _variables, context) => {
            const { serverId, serverAttachments } = data;
            if (!context || !roomId) {
                return;
            }

            // Очищаем временные Blob URL после успешной загрузки на сервер
            if (context.blobUrls && context.blobUrls.length > 0) {
                for (const url of context.blobUrls) {
                    URL.revokeObjectURL(url);
                }
            }

            queryClient.setQueryData<ChatMessage[]>(
                QUERY_KEYS.messages(roomId),
                (old = []) => {
                    const realtimeAlreadyArrived = old.some(
                        (m) => m.id === serverId && !m._tempId,
                    );

                    if (realtimeAlreadyArrived) {
                        return old.filter((m) => m.id !== context.tempId);
                    }

                    return old.map((m) => {
                        if (m.id === context.tempId) {
                            return {
                                ...m,
                                id: serverId,
                                attachments: serverAttachments,
                                _uiStatus: !navigator.onLine
                                    ? CLIENT_MESSAGE_STATUS.QUEUED
                                    : undefined,
                                _tempId: !navigator.onLine
                                    ? m._tempId
                                    : undefined,
                                _retryFiles: undefined,
                                _retryAudioBlob: undefined,
                                _retryVideoBlob: undefined,
                            };
                        }
                        return m;
                    });
                },
            );

            // Обновляем последнее сообщение в списке чатов (заменяем временное на постоянное)
            queryClient.setQueryData<RoomWithMembers[]>(
                QUERY_KEYS.rooms(user?.id),
                (old = []) => {
                    return old.map((room) => {
                        // Проверяем, что это наша комната и в ней именно наше временное сообщение
                        if (
                            room.id === roomId &&
                            room.last_message &&
                            room.last_message.id === context.tempId
                        ) {
                            return {
                                ...room,
                                last_message: {
                                    ...room.last_message,
                                    id: serverId,
                                    attachments: serverAttachments,
                                },
                            };
                        }
                        return room;
                    });
                },
            );
        },

        /**
         * Ошибка
         */
        onError: (error, _variables, context) => {
            if (!context || !roomId) {
                return;
            }

            logger.error("Ошибка отправки сообщения", error);

            queryClient.setQueryData<ChatMessage[]>(
                QUERY_KEYS.messages(roomId),
                (old = []) =>
                    old.map((m) => {
                        if (m.id === context.tempId) {
                            return {
                                ...m,
                                _uiStatus: CLIENT_MESSAGE_STATUS.FAILED,
                            };
                        }
                        return m;
                    }),
            );

            toast({
                title: t("chat.sendFailed", "Не удалось отправить сообщение"),
                variant: "error",
            });
        },

        /**
         * Завершение мутации
         */
        onSettled: (_data, _error, _variables) => {
            if (!roomId || !user) {
                return;
            }

            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.messages(roomId),
            });
        },
    });

    const retryMessage = (message: ChatMessage) => {
        if (!roomId) {
            return;
        }

        // Очищаем старые blob URL
        if (message._blobUrls && message._blobUrls.length > 0) {
            for (const url of message._blobUrls) {
                URL.revokeObjectURL(url);
            }
        }

        // Удаляем упавшее сообщение из кэша
        queryClient.setQueryData<ChatMessage[]>(
            QUERY_KEYS.messages(roomId),
            (old = []) => {
                return old.filter((m) => {
                    return m.id !== message.id;
                });
            },
        );

        // Повторяем мутацию
        mutation.mutate({
            text: message.content || "",
            files: message._retryFiles,
            audioBlob: message._retryAudioBlob,
            videoBlob: message._retryVideoBlob,
            replyToId: message.metadata?.reply_to_id,
            forwardFromName: message.metadata?.forward_from_name,
            forwardFromId: message.metadata?.forward_from_id,
            isVideoMessage: message.metadata?.is_video_message,
        });
    };

    return {
        ...mutation,
        retryMessage,
    };
}
