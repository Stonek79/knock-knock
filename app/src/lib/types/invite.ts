import type {
    RoomsTypeOptions,
    RoomsVisibilityOptions,
} from "./pocketbase-types";

/**
 * Узкий DTO комнаты, вложенный в RoomInvitePreviewDto.
 * Намеренно не наследуется от RoomsResponse: содержит только те поля, которые
 * реально возвращает авторизованный POST /api/custom/invites/validate.
 */
export interface RoomInviteRoomDto {
    id: string;
    name: string;
    type: RoomsTypeOptions;
    visibility: RoomsVisibilityOptions;
    /** Завёрнутый avatar-URL комнаты; в выдаче validate может отсутствовать. */
    avatar?: string | null;
    description?: string;
}

/**
 * Ответ авторизованного POST /api/custom/invites/validate.
 *
 * Это отдельный allowlist DTO, а не полная запись Invites: содержит только
 * `id`, `room`, `expand.room`, `expires_at`, `max_uses`, `uses_count`.
 * Никогда не включает `token`, `created_by` и прочие внутренние поля.
 */
export interface RoomInvitePreviewDto {
    id: string;
    /** id комнаты (top-level поле равно id из expand.room). */
    room: string;
    expand?: { room?: RoomInviteRoomDto };
    /** Может быть пустым значением или отсутствовать у invite без TTL. */
    expires_at?: string | null;
    /** Если 0 — лимит не ограничен (инвайт многоразовый). */
    max_uses: number;
    uses_count: number;
}
