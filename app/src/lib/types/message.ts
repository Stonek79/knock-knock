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
 * Тип расшифрованного сообщения (контент — обычная строка)
 */
export interface DecryptedMessage extends Omit<Message, "content"> {
	content: string;
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
