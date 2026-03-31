import type { z } from "zod";
import type { ERROR_CODES, MESSAGE_STATUS } from "@/lib/constants";
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
 * Расшифрованное сообщение.
 * Теперь профиль отправителя уже "вшит" в само сообщение через денормализацию.
 */
export type DecryptedMessage = Omit<Message, "content"> & {
    content: string | null;
};

/** Для обратной совместимости, если где-то еще нужен "WithProfile" */
export type DecryptedMessageWithProfile = DecryptedMessage;

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
