/**
 * Типы для функционала чата (Persistent Chat).
 */

import type { CHAT_TYPE } from "@/lib/constants/common";

/** Тип чата для создания: public | private | group */
export type ChatType = (typeof CHAT_TYPE)[keyof typeof CHAT_TYPE];

/** Тип комнаты: личный чат или группа */
export type RoomType = "direct" | "group";

/** Роль участника: админ или обычный участник */
export type MemberRole = "admin" | "member";

/**
 * Структура таблицы rooms (Комнаты)
 */
export interface Room {
	id: string;
	created_at: string;
	type: RoomType;
	name: string | null;
	avatar_url: string | null;
	is_ephemeral: boolean;
}

/**
 * Расширенная структура комнаты с вложенными участниками
 */
export interface RoomWithMembers extends Room {
	room_members: {
		user_id: string;
		profiles: {
			display_name: string;
			username: string;
			avatar_url: string | null;
		} | null;
	}[];
}

/**
 * Структура таблицы room_members (Участники)
 */
export interface RoomMember {
	room_id: string;
	user_id: string;
	role: MemberRole;
	joined_at: string;
}

/**
 * Структура таблицы room_keys (Ключи шифрования)
 */
export interface RoomKey {
	room_id: string;
	user_id: string;
	encrypted_key: string;
	created_at: string;
}

/**
 * Структура таблицы messages (Сообщения)
 */
export interface Message {
	id: string;
	room_id: string;
	sender_id: string | null;
	content: string; // Base64 зашифрованный контент
	iv: string; // Вектор инициализации
	created_at: string;
}

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
