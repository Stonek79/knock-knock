/**
 * Типы для функционала чата (Persistent Chat).
 */

import type { CHAT_TYPE } from '@/lib/constants/common';

/** Тип чата для создания: public | private | group */
export type ChatType = (typeof CHAT_TYPE)[keyof typeof CHAT_TYPE];

/** Тип комнаты: личный чат или группа */
export type RoomType = 'direct' | 'group';

/** Роль участника: админ или обычный участник */
export type MemberRole = 'admin' | 'member';

/**
 * Структура таблицы rooms (Комнаты)
 */
export interface Room {
    id: string;
    created_at: string;
    type: RoomType;
    name: string | null;
    is_ephemeral: boolean;
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
