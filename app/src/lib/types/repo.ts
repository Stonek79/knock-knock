/**
 * ТИПЫ РЕПОЗИТОРИЕВ
 * Централизованное хранилище типов для работы с базой данных PocketBase.
 */

import type { PBMessage, PBRoom, PBRoomMember, PBUser } from "./pocketbase";
import type { AppError } from "./result";

export type UserRecord = PBUser;
export type RoomRecord = PBRoom;
export type RoomMemberRecord = PBRoomMember;
export type MessageRecord = PBMessage;

/**
 * ОШИБКИ РЕПОЗИТОРИЕВ
 */

import type { ErrorCode } from "./errors";

export type UserRepoError = AppError<ErrorCode>;
export type AuthRepoError = AppError<ErrorCode>;
export type RoomRepoError = AppError<ErrorCode>;
export type MessageRepoError = AppError<ErrorCode>;
export type MediaRepoError = AppError<ErrorCode>;
export type PresenceRepoError = AppError<ErrorCode>;

/** Типизация expand */
export type RoomExpand = string;
export type MessageExpand = string;
export type RoomChatExpand = {
    [key: string]: unknown; // Позволяет обращаться по динамическому ключу
    last_message?: MessageRecord;
};

/**
 * Расширенный тип записи комнаты для репозитория.
 * Содержит уже смапленных участников и сообщение, избавляя слои выше от работы с expand.
 */
export type RoomRecordWithMembers = RoomRecord & {
    /** Список участников, где уже развернуты профили пользователей (user) */
    members: (RoomMemberRecord & { userProfile: UserRecord | null })[];
    /** Последнее сообщение в комнате */
    lastMessage: MessageRecord | null;
};

/** Типизация сортировки */
export type UserSort =
    | `-${Extract<keyof PBUser, string>}`
    | `+${Extract<keyof PBUser, string>}`
    | Extract<keyof PBUser, string>;
