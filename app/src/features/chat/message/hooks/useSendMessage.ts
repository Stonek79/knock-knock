import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";
import {
    ATTACHMENT_TYPES,
    CLIENT_MESSAGE_STATUS,
    DEFAULT_MIME_TYPES,
    QUERY_KEYS,
} from "@/lib/constants";
import { logger } from "@/lib/logger";
import { MessageService } from "@/lib/services/message";
import type { Attachment, ChatMessage, Profile } from "@/lib/types";
import { uploadAudio, uploadMedia } from "../services/uploadMedia";
import { createOptimisticMessage } from "../utils/optimistic";

/**
 * Параметры инициализации хука useSendMessage
 */
interface UseSendMessageOptions {
    /** ID текущей комнаты (опционален для безусловного вызова хука) */
    roomId?: string;
    /** Ключ шифрования комнаты (AES-GCM) */
    roomKey?: CryptoKey;
    /** Профиль текущего пользователя */
    user?: Profile | null;
}

/**
 * Переменные мутации (передаются в mutate())
 */
interface SendMessageVariables {
    /** Текст сообщения */
    text: string;
    /** Прикреплённые файлы (фото, видео, документы) */
    files?: File[];
    /** Голосовое сообщение (аудио blob) */
    audioBlob?: Blob;
}

/**
 * Контекст оптимистичной мутации (возвращается из onMutate для rollback)
 */
interface SendMessageContext {
    /** Снимок кэша сообщений до оптимистичного обновления */
    previousMessages: ChatMessage[];
    /** Временный ID оптимистичного сообщения */
    tempId: string;
    /** Blob URLs для очистки */
    blobUrls: string[];
}

/**
 * Хук оптимистичной отправки сообщений.
 *
 * Использует TanStack Query useMutation с полным lifecycle:
 * - onMutate: мгновенно добавляет сообщение в кэш (UI показывает «отправляется»)
 * - onSuccess: заменяет tempId на реальный серверный ID
 * - onError: помечает сообщение как FAILED (доступен retry)
 * - onSettled: очищает blob URLs + инвалидирует кэш для финальной синхронизации
 *
 * @param options - roomId, roomKey, user
 * @returns TanStack useMutation результат
 */
export function useSendMessage({
    roomId,
    roomKey,
    user,
}: UseSendMessageOptions) {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation<string, Error, SendMessageVariables, SendMessageContext>(
        {
            /**
             * Основная функция отправки: загрузка медиа + шифрование + отправка.
             * Возвращает серверный ID созданного сообщения.
             */
            mutationFn: async ({ text, files, audioBlob }) => {
                if (!roomId || !roomKey || !user) {
                    throw new Error(
                        "Невозможно отправить: параметры не инициализированы",
                    );
                }

                const attachments: Attachment[] = [];

                // 1. Загружаем медиа (если есть)
                if (audioBlob) {
                    const audioAttachment = await uploadAudio({
                        blob: audioBlob,
                        userId: user.id,
                        roomKey,
                    });
                    attachments.push(audioAttachment);
                }

                if (files && files.length > 0) {
                    const filePromises = files.map((file) =>
                        uploadMedia({
                            file,
                            userId: user.id,
                            fileNameOverride: file.name,
                        }),
                    );
                    const uploadedFiles = await Promise.all(filePromises);
                    attachments.push(...uploadedFiles);
                }

                // 2. Шифруем и отправляем на сервер
                const result = await MessageService.sendMessage({
                    roomId,
                    senderId: user.id,
                    senderName: user.display_name,
                    senderAvatar: user.avatar_url || "",
                    content: text,
                    roomKey,
                    attachments:
                        attachments.length > 0 ? attachments : undefined,
                });

                if (result.isErr()) {
                    throw new Error(result.error.message);
                }

                // Возвращаем серверный ID сообщения
                return result.value;
            },

            /**
             * Optimistic update: мгновенно вставляем сообщение в кэш.
             * Пользователь видит сообщение СРАЗУ с индикатором «отправляется».
             */
            onMutate: async (variables) => {
                if (!roomId || !roomKey || !user) {
                    return { previousMessages: [], tempId: "", blobUrls: [] };
                }

                // 1. Отменяем текущие refetch'и (чтобы не перезаписали оптимистичные данные)
                await queryClient.cancelQueries({
                    queryKey: QUERY_KEYS.messages(roomId),
                });

                // 2. Снапшот текущих данных для потенциального rollback
                const previousMessages =
                    queryClient.getQueryData<ChatMessage[]>(
                        QUERY_KEYS.messages(roomId),
                    ) ?? [];

                // 3. Генерируем временный ID
                const tempId = crypto.randomUUID();

                // 4. Формируем blob URLs для медиа-превью
                const blobUrls: string[] = [];
                const optimisticAttachments: Attachment[] = [];

                if (variables.audioBlob) {
                    const blobUrl = URL.createObjectURL(variables.audioBlob);
                    blobUrls.push(blobUrl);
                    optimisticAttachments.push({
                        id: `temp-audio-${tempId}`,
                        file_name: "voice-message.webm",
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

                        const type = file.type.startsWith(
                            `${ATTACHMENT_TYPES.IMAGE}/`,
                        )
                            ? ATTACHMENT_TYPES.IMAGE
                            : file.type.startsWith(`${ATTACHMENT_TYPES.VIDEO}/`)
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

                // 5. Оптимистично добавляем в кэш
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

                return { previousMessages, tempId, blobUrls };
            },

            /**
             * Успешная отправка: заменяем tempId на реальный серверный ID.
             * Защита от дубликата с Realtime: проверяем, не пришло ли сообщение через SSE раньше.
             */
            onSuccess: (serverId, _variables, context) => {
                if (!context || !roomId) {
                    return;
                }

                queryClient.setQueryData<ChatMessage[]>(
                    QUERY_KEYS.messages(roomId),
                    (old = []) => {
                        // Проверяем, не пришло ли сообщение через Realtime раньше
                        const realtimeAlreadyArrived = old.some(
                            (m) => m.id === serverId && !m._tempId,
                        );

                        if (realtimeAlreadyArrived) {
                            // Realtime уже добавил — просто убираем оптимистичное
                            return old.filter((m) => m.id !== context.tempId);
                        }

                        // Realtime ещё не пришёл — заменяем tempId на реальный ID
                        return old.map((m) => {
                            if (m.id === context.tempId) {
                                return {
                                    ...m,
                                    id: serverId,
                                    _uiStatus: undefined,
                                    _tempId: undefined,
                                };
                            }
                            return m;
                        });
                    },
                );
            },

            /**
             * Ошибка: помечаем сообщение как FAILED (не полный rollback — даём retry).
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
                    title: "Не удалось отправить сообщение",
                    variant: "error",
                });
            },

            /**
             * Завершение мутации (успех или ошибка):
             * - Очищаем blob URLs для предотвращения утечки памяти
             * - Инвалидируем кэш для финальной синхронизации с сервером
             */
            onSettled: (_data, _error, _variables, context) => {
                // Очищаем blob URLs из памяти
                if (context?.blobUrls) {
                    for (const url of context.blobUrls) {
                        URL.revokeObjectURL(url);
                    }
                }

                if (!roomId || !user) {
                    return;
                }

                // Финальная синхронизация с сервером
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.messages(roomId),
                });
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.rooms(user.id),
                });
            },
        },
    );
}
