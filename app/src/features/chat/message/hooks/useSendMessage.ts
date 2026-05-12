import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import {
    ATTACHMENT_TYPES,
    CLIENT_MESSAGE_STATUS,
    DEFAULT_MIME_TYPES,
    MIME_PREFIXES,
    QUERY_KEYS,
} from "@/lib/constants";
import { logger } from "@/lib/logger";
import { mediaService } from "@/lib/services/media";
import { MessageService } from "@/lib/services/message";
import type {
    Attachment,
    ChatMessage,
    Profile,
    RoomWithMembers,
} from "@/lib/types";
import { createOptimisticMessage } from "../utils/optimistic";

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

    return useMutation<
        { serverId: string; serverAttachments: Attachment[] | null },
        Error,
        SendMessageVariables,
        SendMessageContext
    >({
        /**
         * Основная функция отправки: загрузка медиа + шифрование + отправка.
         */
        mutationFn: async ({ text, files, audioBlob }) => {
            if (!roomId || !roomKey || !user) {
                throw new Error(
                    "Невозможно отправить: параметры не инициализированы",
                );
            }

            const attachments: Attachment[] = [];

            // 1. Загружаем медиа через единый сервис оркестрации
            if (audioBlob) {
                const uploadResult = await mediaService.uploadMedia({
                    file: audioBlob,
                    userId: user.id,
                    roomId,
                    cryptoKey: roomKey,
                });

                if (uploadResult.isErr()) {
                    throw new Error(uploadResult.error.message);
                }

                const record = uploadResult.value;

                // Определяем правильное расширение для Safari (mp4/m4a)
                const isMp4 = audioBlob.type.includes("mp4");
                const extension = isMp4 ? "m4a" : "webm";

                attachments.push({
                    id: record.id,
                    file_name: `voice-message.${extension}`,
                    file_size: audioBlob.size,
                    content_type:
                        audioBlob.type || DEFAULT_MIME_TYPES.WEBM_AUDIO,
                    url: mediaService.getFileUrl(record, record.file),
                    type: ATTACHMENT_TYPES.AUDIO,
                });
            }

            if (files && files.length > 0) {
                const uploadPromises = files.map(async (file) => {
                    const uploadResult = await mediaService.uploadMedia({
                        file,
                        userId: user.id,
                        roomId,
                        cryptoKey: roomKey,
                    });

                    if (uploadResult.isErr()) {
                        throw new Error(uploadResult.error.message);
                    }

                    const record = uploadResult.value;

                    const type = file.type.startsWith(MIME_PREFIXES.IMAGE)
                        ? ATTACHMENT_TYPES.IMAGE
                        : file.type.startsWith(MIME_PREFIXES.VIDEO)
                          ? ATTACHMENT_TYPES.VIDEO
                          : ATTACHMENT_TYPES.DOCUMENT;

                    const attachment: Attachment = {
                        id: record.id,
                        file_name: file.name,
                        file_size: file.size,
                        content_type: file.type,
                        url: mediaService.getFileUrl(record, record.file),
                        thumbnail_url: record.thumbnail
                            ? mediaService.getFileUrl(record, record.thumbnail)
                            : undefined,
                        type,
                    };

                    return attachment;
                });

                const uploaded = await Promise.all(uploadPromises);
                attachments.push(...uploaded);
            }

            // 2. Шифруем и отправляем на сервер
            const result = await MessageService.sendMessage({
                roomId,
                senderId: user.id,
                senderName: user.display_name,
                senderAvatar: user?.avatar_url || "",
                content: text,
                roomKey,
                attachments: attachments.length > 0 ? attachments : undefined,
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
            const blobUrls: string[] = [];
            const optimisticAttachments: Attachment[] = [];

            if (variables.audioBlob) {
                const blobUrl = URL.createObjectURL(variables.audioBlob);
                blobUrls.push(blobUrl);

                const isMp4 = variables.audioBlob.type.includes("mp4");
                const extension = isMp4 ? "m4a" : "webm";

                optimisticAttachments.push({
                    id: `temp-audio-${tempId}`,
                    file_name: `voice-message.${extension}`,
                    file_size: variables.audioBlob.size,
                    content_type: DEFAULT_MIME_TYPES.WEBM_AUDIO,
                    url: blobUrl,
                    type: ATTACHMENT_TYPES.AUDIO,
                });
            }

            if (variables.files) {
                for (const file of variables.files) {
                    const blobUrl = URL.createObjectURL(file);
                    blobUrls.push(blobUrl);

                    const type = file.type.startsWith(MIME_PREFIXES.IMAGE)
                        ? ATTACHMENT_TYPES.IMAGE
                        : file.type.startsWith(MIME_PREFIXES.VIDEO)
                          ? ATTACHMENT_TYPES.VIDEO
                          : ATTACHMENT_TYPES.DOCUMENT;

                    optimisticAttachments.push({
                        id: `temp-file-${tempId}-${file.name}`,
                        file_name: file.name,
                        file_size: file.size,
                        content_type: file.type,
                        url: blobUrl,
                        type,
                    });
                }
            }

            queryClient.setQueryData<ChatMessage[]>(
                QUERY_KEYS.messages(roomId),
                (old = []) => [
                    ...old,
                    createOptimisticMessage({
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
                ],
            );

            // --- Оптимистичное обновление списка чатов ---
            const optimisticMsg = createOptimisticMessage({
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
            });

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
                                _uiStatus: undefined,
                                _tempId: undefined,
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
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.rooms(user.id),
            });
        },
    });
}
