import type {
    PBRecord,
    PBRoom,
    PBRoomMember,
    RoomType,
    RoomWithMembers,
} from "@/lib/types";
import { DB_EXPAND, ROOM_TYPE } from "../../constants";
import { ensureISODate } from "../../utils/date";

/**
 * Типовой предикат: проверяет, что значение является объектом (Record).
 * Используется для безопасной валидации JSON-полей из БД без кастования.
 */
const isRecord = (val: unknown): val is Record<string, unknown> => {
    return typeof val === "object" && val !== null && !Array.isArray(val);
};

/**
 * Проверка, является ли переданная строка допустимым типом комнаты
 */
const isRoomType = (type: unknown): type is RoomType => {
    return (
        typeof type === "string" &&
        Object.values(ROOM_TYPE).includes(type as RoomType)
    );
};

/**
 * Расширенная запись комнаты из PocketBase с учетом связей.
 * Используем прямые типы из БД (PBRoom, PBRoomMember).
 */
export type PBRoomExpanded = PBRoom & {
    expand?: {
        [DB_EXPAND.MEMBERS]?: PBRoomMember[];
    };
};

/**
 * МАППЕР ДЛЯ КОМНАТ
 * Отвечает за безопасное преобразование данных из БД в доменную модель приложения.
 */
export const RoomMapper = {
    toDomain(
        record: PBRoomExpanded,
        getFileUrl: (record: PBRecord, filename: string) => string,
    ): RoomWithMembers {
        const avatar = record.avatar ? getFileUrl(record, record.avatar) : null;

        const members = (record.expand?.[DB_EXPAND.MEMBERS] || []).map((m) => {
            return {
                room_id: m.room,
                user_id: m.user,
                role: m.role,
                unread_count: m.unread_count || 0,
                last_read_at: m.last_read_at
                    ? ensureISODate(m.last_read_at)
                    : null,
                joined_at: ensureISODate(m.created),
                pin_position:
                    typeof m.pin_position === "number" ? m.pin_position : null,
            };
        });

        const domainRoom: RoomWithMembers = {
            id: record.id,
            name: record.name || null,
            type: isRoomType(record.type) ? record.type : ROOM_TYPE.DIRECT,
            visibility: record.visibility,
            created_at: ensureISODate(record.created),
            updated: record.updated,
            created_by: record.created_by,
            last_message: null,
            avatar_url: avatar,
            room_members: members,
            metadata: isRecord(record.metadata) ? record.metadata : {},
            permissions: isRecord(record.permissions) ? record.permissions : {},
        };

        return domainRoom;
    },
};
