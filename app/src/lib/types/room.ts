import type { z } from "zod";
import type {
    chatTypeSchema,
    expandedMemberSchema,
    memberRoleSchema,
    peerUserSchema,
    roomKeySchema,
    roomMemberSchema,
    roomSchema,
    roomTypeSchema,
    roomWithMembersSchema,
    unreadCountSchema,
} from "@/lib/schemas/room";
import type {
    metadataSchema,
    roomMemberSettingsSchema,
} from "@/lib/schemas/settings";
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
 * Настройки участника комнаты (room_members.settings)
 */
export type RoomMemberSettings = z.infer<typeof roomMemberSettingsSchema>;

/**
 * Метаданные (metadata)
 */
export type Metadata = z.infer<typeof metadataSchema>;

/**
 * Структура таблицы room_keys (Ключи шифрования)
 */
export type RoomKey = z.infer<typeof roomKeySchema>;

/**
 * Расширенная структура комнаты.
 * Тип полностью выводится из Zod-схемы.
 */
export type RoomWithMembers = z.infer<typeof roomWithMembersSchema>;

/**
 * Тип расширенного участника (с профилем, ролью и датами)
 */
export type ExpandedRoomMember = z.infer<typeof expandedMemberSchema>;

/**
 * Расширенная структура комнаты с вложенными участниками
 */
export type RoomDataWithKey = {
    room: RoomWithMembers;
    roomKey: CryptoKey;
    otherUserId?: string;
};

/**
 * Упрощенная структура пользователя-собеседника для отображения в интерфейсе
 */
export type PeerUser = z.infer<typeof peerUserSchema>;

/**
 * Типы ошибок, которые могут возникнуть при работе с комнатами
 */
export type RoomError =
    | AppError<typeof ERROR_CODES.DB_ERROR, Error>
    | AppError<typeof ERROR_CODES.MISSING_KEYS, { userIds: string[] }>
    | AppError<typeof ERROR_CODES.CRYPTO_ERROR, Error>
    | AppError<typeof ERROR_CODES.NOT_FOUND>;

/**
 * Счет непрочитанных сообщений в комнате.
 */
export type UnreadCount = z.infer<typeof unreadCountSchema>;
