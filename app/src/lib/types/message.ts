import type { z } from "zod";
import type { messageSchema } from "@/lib/schemas/message";

/**
 * Структура таблицы messages (Сообщения)
 */
export type Message = z.infer<typeof messageSchema>;

/**
 * Структура сообщения в БД (до расшифровки)
 */
export type MessageRow = Message;

/**
 * Статус сообщения
 */
export type MessageStatus = "sent" | "delivered" | "read";

/**
 * Тип расшифрованного сообщения (контент — строка или null если удалено)
 */
export interface DecryptedMessage extends Omit<Message, "content"> {
	content: string | null;
}

/**
 * Расшифрованное сообщение с профилем отправителя
 */
export interface DecryptedMessageWithProfile extends DecryptedMessage {
	profiles: {
		display_name: string;
		avatar_url: string | null;
	} | null;
}
