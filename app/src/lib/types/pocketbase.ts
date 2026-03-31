import type { RecordModel } from "pocketbase";
import type {
    MessagesResponse,
    PresenceStatusResponse,
    RoomMembersResponse,
    RoomsResponse,
    UsersResponse,
} from "./pocketbase-types";

/** Базовый тип записи */
export type PBRecord = RecordModel;

/** Алиасы на основе автосгенерированных типов */
export type PBUser = UsersResponse<Record<string, unknown>>;
export type PBRoom = RoomsResponse<Record<string, unknown>>;
export type PBRoomMember = RoomMembersResponse<Record<string, unknown>>;
export type PBMessage = MessagesResponse<Record<string, unknown>>;
export type PBPresenceStatus = PresenceStatusResponse<Record<string, unknown>>;

/** Типизация Realtime событий без строк */
export type PBRealtimeAction = "create" | "update" | "delete";

export type PBRealtimeEvent<T extends RecordModel = RecordModel> = {
    action: PBRealtimeAction;
    record: T;
};
