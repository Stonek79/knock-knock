import type { PostgrestError } from "@supabase/supabase-js";
import type { z } from "zod";
import type {
    chatTypeSchema,
    memberRoleSchema,
    roomKeySchema,
    roomMemberSchema,
    roomSchema,
    roomTypeSchema,
} from "@/lib/schemas/room";
import type { ERROR_CODES } from "../constants";
import type { AppError } from "./result";

/** Тип чата для создания: public | private | group */
export type ChatType = z.infer<typeof chatTypeSchema>;

/** Тип комнаты: личный чат или группа */
export type RoomType = z.infer<typeof roomTypeSchema>;

/** Роль участника: админ или обычный участник */
export type MemberRole = z.infer<typeof memberRoleSchema>;

/**
 * Структура таблицы rooms (Комнаты)
 */
export type Room = z.infer<typeof roomSchema>;

/**
 * Структура таблицы room_members (Участники)
 */
export type RoomMember = z.infer<typeof roomMemberSchema>;

/**
 * Структура таблицы room_keys (Ключи шифрования)
 */
export type RoomKey = z.infer<typeof roomKeySchema>;

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
 * Упрощенная структура пользователя-собеседника для отображения в интерфейсе
 */
export interface PeerUser {
    id: string;
    display_name: string;
    username?: string;
    avatar_url?: string | null;
}

/**
 * Типы ошибок, которые могут возникнуть при работе с комнатами
 */
export type RoomError =
    | AppError<typeof ERROR_CODES.DB_ERROR, PostgrestError>
    | AppError<typeof ERROR_CODES.MISSING_KEYS, { userIds: string[] }>
    | AppError<typeof ERROR_CODES.CRYPTO_ERROR, Error>
    | AppError<typeof ERROR_CODES.NOT_FOUND>;
