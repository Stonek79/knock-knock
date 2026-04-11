import type { z } from "zod";
import type { ERROR_CODES, MESSAGE_STATUS } from "@/lib/constants";
import type { CLIENT_MESSAGE_STATUS } from "@/lib/constants/ui";
import type {
    messageAttachmentSchema,
    messagePositionSchema,
    messageReactionSchema,
    messageSchema,
} from "@/lib/schemas/message";
import type { AppError } from "./result";

/**
 * Тип ошибки сервиса сообщений.
 */
export type MessageError =
    | AppError<typeof ERROR_CODES.DB_ERROR, unknown>
    | AppError<typeof ERROR_CODES.CRYPTO_ERROR, unknown>;

/**
 * Структура таблицы messages (Сообщения)
 */
export type Message = z.infer<typeof messageSchema>;

/**
 * Тип позиции сообщения в группе (single, start, middle, end)
 */
export type MessagePosition = z.infer<typeof messagePositionSchema>;

/**
 * Структура сообщения в БД (до расшифровки)
 */
export type MessageRow = Message;

/**
 * Статус сообщения
 */
export type MessageStatus =
    (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

/**
 * Клиентский статус сообщения (не сохраняется в БД)
 */
export type ClientMessageStatus =
    (typeof CLIENT_MESSAGE_STATUS)[keyof typeof CLIENT_MESSAGE_STATUS];

/**
 * Объединённый статус для отображения в UI.
 * Серверные статусы (sent, delivered, read) + клиентские (sending, failed).
 */
export type UIMessageStatus = MessageStatus | ClientMessageStatus;

/**
 * Расшифрованное сообщение.
 * Теперь профиль отправителя уже "вшит" в само сообщение через денормализацию.
 */
export type DecryptedMessage = Omit<Message, "content"> & {
    content: string | null;
};

/** Для обратной совместимости, если где-то еще нужен "WithProfile" */
export type DecryptedMessageWithProfile = DecryptedMessage;

/**
 * Сообщение для отображения в UI.
 * Расширяет серверный DecryptedMessageWithProfile клиентскими мета-полями
 * для поддержки оптимистичных обновлений.
 *
 * Эти поля существуют ТОЛЬКО в кэше TanStack Query и не сохраняются в БД.
 */
export type ChatMessage = DecryptedMessageWithProfile & {
    /** Клиентский UI-статус (sending, failed). undefined = серверный статус актуален. */
    _uiStatus?: ClientMessageStatus;
    /** Временный ID до получения реального от сервера */
    _tempId?: string;
    /** Blob URLs для медиа-превью (нужны для revokeObjectURL при очистке) */
    _blobUrls?: string[];
};

/**
 * Структура вложения сообщения
 */
export type Attachment = z.infer<typeof messageAttachmentSchema>;

/**
 * Тип вложения (image, video, audio, document)
 */
export type AttachmentType = Attachment["type"];

/**
 * Структура записи реакции (message_reactions)
 */
export type MessageReaction = z.infer<typeof messageReactionSchema>;
