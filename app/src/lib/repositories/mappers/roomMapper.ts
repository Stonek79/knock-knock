import { DB_EXPAND } from "@/lib/constants";
import { roomWithMembersSchema } from "@/lib/schemas/room";
import type {
    MessageRecord,
    PBRecord,
    PBRoom,
    PBRoomMember,
    RoomWithMembers,
} from "@/lib/types";
import { ensureISODate } from "@/lib/utils/date";
import { MessageMapper } from "./messageMapper";

/**
 * Типизированный участник из PocketBase с учетом наших полей в БД.
 */
type PBRoomMemberWithFields = PBRoomMember & {
    role: string;
    settings?: Record<string, unknown>;
    permissions?: Record<string, unknown>;
    user_name?: string;
    user_avatar?: string;
};

/**
 * Расширенная запись комнаты из PocketBase с учетом связей.
 */
export type PBRoomExpanded = PBRoom & {
    expand: {
        [DB_EXPAND.MEMBERS]: PBRoomMemberWithFields[];
        last_message?: MessageRecord;
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
                settings: {
                    notifications: true,
                    ...(m.settings || {}),
                },
                permissions: m.permissions || {},
                profiles: {
                    display_name: m.user_name || "",
                    username: "",
                    avatar_url: m.user_avatar
                        ? getFileUrl(m, m.user_avatar)
                        : null,
                },
            };
        });

        const domainRoom: RoomWithMembers = {
            id: record.id,
            name: record.name || null,
            type: record.type,
            visibility: record.visibility,
            created_at: ensureISODate(record.created),
            created_by: record.created_by,
            last_message_id: record.last_message || null,
            last_message: record.expand?.last_message
                ? MessageMapper.toRow(record.expand.last_message)
                : null,
            avatar_url: avatar,
            room_members: members,
            metadata: (record.metadata as Record<string, unknown>) || {},
            permissions: (record.permissions as Record<string, unknown>) || {},
        };
        // Валидируем результат через Zod перед возвратом
        return roomWithMembersSchema.parse(domainRoom);
    },
};
