import type { z } from "zod";
import type { ERROR_CODES, ROOM_TYPE, ROOM_VISIBILITY } from "../constants";
import type {
    expandedMemberSchema,
    peerUserSchema,
    roomWithMembersSchema,
} from "../schemas/room";
import type { PBRoom, PBRoomMember } from "./pocketbase";
import type { AppError } from "./result";

/** Тип комнаты */
export type RoomType = (typeof ROOM_TYPE)[keyof typeof ROOM_TYPE];

/** Видимость комнаты */
export type RoomVisibility =
    (typeof ROOM_VISIBILITY)[keyof typeof ROOM_VISIBILITY];

/** Тип комнаты напрямую из БД */
export type Room = PBRoom;

/** Тип участника напрямую из БД */
export type RoomMember = PBRoomMember;

/**
 * Расширенная структура комнаты (доменная модель).
 * Тип выводится из Zod-схемы для обеспечения рантайм-валидации в мапперах.
 */
export type RoomWithMembers = z.infer<typeof roomWithMembersSchema>;

/**
 * Тип расширенного участника (с профилем, ролью и датами)
 */
export type ExpandedRoomMember = z.infer<typeof expandedMemberSchema>;

/**
 * Расширенная структура комнаты с вложенными участниками и ключом
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

/** Алиас для обратной совместимости (ChatType === RoomType) */
export type ChatType = RoomType;

/**
 * Элемент списка чатов для UI (без сервисных полей сортировки).
 */
export type ChatItem = {
    id: string;
    name: string;
    avatar?: string;
    lastMessage: string;
    time: string;
    unread: number;
    pinPosition: number | null;
};

/**
 * Расширенный элемент списка чатов.
 * Содержит сервисные поля для сортировки и фильтрации,
 * которые очищаются перед рендером.
 */
export type ExtendedChatItem = ChatItem & {
    /** Является ли чат «Избранным» (self-chat) */
    isSavedMessages: boolean;
    /** Является ли чат self-chat */
    isSelf: boolean;
    /** Является ли чат эфемерным */
    isEphemeral: boolean;
    /** Timestamp для сортировки (вычисляется) */
    _lastMsgTimestamp: number;
};
