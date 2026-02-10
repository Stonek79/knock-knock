import type { z } from "zod";
import type {
    chatTypeSchema,
    memberRoleSchema,
    roomKeySchema,
    roomMemberSchema,
    roomSchema,
    roomTypeSchema,
} from "@/lib/schemas/room";

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
