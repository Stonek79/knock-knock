import type { z } from "zod";
import type {
    CLIENT_MESSAGE_STATUS,
    ERROR_CODES,
    MESSAGE_FIELDS,
    MESSAGE_POSITION,
    MESSAGE_STATUS,
} from "../constants";
import type {
    messageAttachmentSchema,
    messageMetadataSchema,
    messageReactionSchema,
} from "../schemas/message";
import type { PBMessage } from "./pocketbase";
import type { AppError } from "./result";

/**
 * Тип ошибки сервиса сообщений.
 */
export type MessageError =
    | AppError<typeof ERROR_CODES.DB_ERROR, unknown>
    | AppError<typeof ERROR_CODES.CRYPTO_ERROR, unknown>;

/**
 * Структура таблицы messages (Сообщения) напрямую из PocketBase
 */
export type Message = PBMessage;

/**
 * Тип метаданных сообщения
 */
export type MessageMetadata = z.infer<typeof messageMetadataSchema> & {
    deleted_at?: string;
};

/** Поля PBMessage, которые мы переопределяем в доменной модели */
type MessageOmitKeys =
    | typeof MESSAGE_FIELDS.METADATA
    | typeof MESSAGE_FIELDS.ATTACHMENTS
    | typeof MESSAGE_FIELDS.REACTIONS_SUMMARY;

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

/**
 * Доменная модель сообщения в БД (MessageRow).
 * Расширяет PBMessage типизированными JSON-полями и денормализованными данными.
 */
export type MessageRow = Omit<PBMessage, MessageOmitKeys> & {
    [MESSAGE_FIELDS.METADATA]: MessageMetadata;
    [MESSAGE_FIELDS.ATTACHMENTS]: Attachment[] | null;
    [MESSAGE_FIELDS.REACTIONS_SUMMARY]: Record<string, number> | null;
    /** Денормализованные данные профиля отправителя (для UI) */
    profiles?: {
        display_name: string;
        avatar_url: string;
    };
};

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
export type DecryptedMessage = Omit<MessageRow, "content"> & {
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
 * Позиция сообщения в визуальной группе (single, start, middle, end).
 * Выводится из константы MESSAGE_POSITION.
 */
export type MessagePosition =
    (typeof MESSAGE_POSITION)[keyof typeof MESSAGE_POSITION];
