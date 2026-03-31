import { MESSAGE_FIELDS, MESSAGE_STATUS, MESSAGE_TYPE } from "@/lib/constants";
import {
    messageAttachmentSchema,
    messageMetadataSchema,
} from "@/lib/schemas/message";
import type {
    Attachment,
    MessageRow,
    MessageStatus,
    PBMessage,
} from "@/lib/types";
import { ensureISODate } from "@/lib/utils/date";

export const MessageMapper = {
    // Конвертация статуса
    mapStatus(raw?: string): MessageStatus {
        if (raw === MESSAGE_STATUS.DELIVERED) {
            return MESSAGE_STATUS.DELIVERED;
        }
        if (raw === MESSAGE_STATUS.READ) {
            return MESSAGE_STATUS.READ;
        }
        return MESSAGE_STATUS.SENT;
    },

    // Парсинг вложений
    parseAttachments(json: unknown): Attachment[] | null {
        if (!json || !Array.isArray(json)) {
            return null;
        }
        const parsed = json
            .map((item) => {
                const result = messageAttachmentSchema.safeParse(item);
                return result.success ? (result.data as Attachment) : null;
            })
            .filter((item): item is Attachment => item !== null);
        return parsed.length > 0 ? parsed : null;
    },

    /**
     * Маппинг сырого рекорда PocketBase в доменную модель приложения.
     * Здесь мы приводим структуру БД к структуре приложения без костылей.
     */
    toRow(record: PBMessage): MessageRow {
        const metadata = messageMetadataSchema.parse(record.metadata || {});
        const reactions_summary =
            (record.reactions_summary as Record<string, number>) || {};

        return {
            id: record.id,
            room_id: record.room,
            sender_id: record.sender,
            sender_name: record.sender_name,
            sender_avatar: record.sender_avatar,
            // Добавляем profiles для совместимости с UI
            profiles: {
                display_name: record.sender_name,
                avatar_url: record.sender_avatar,
            },
            content: record.content || null,
            iv: record.iv || null,
            created_at: ensureISODate(record.created),
            updated_at: ensureISODate(record.updated),
            status: this.mapStatus(record.status),
            is_edited: record.is_edited || false,
            is_deleted: record.is_deleted || false,
            is_starred: record.is_starred || false,
            attachments: this.parseAttachments(record.attachments),
            metadata,
            reactions_summary,
        };
    },

    // toDomain удален, используйте toRow для маппинга из PocketBase в MessageRow

    /**
     * Маппинг данных для создания сообщения из доменной модели в поля PocketBase.
     */
    toCreateRecord(data: Partial<MessageRow>): Partial<PBMessage> {
        const record: Partial<PBMessage> = {};

        if (data.room_id) {
            record[MESSAGE_FIELDS.ROOM] = data.room_id;
        }
        if (data.sender_id) {
            record[MESSAGE_FIELDS.SENDER] = data.sender_id;
        }
        if (data.sender_name) {
            record[MESSAGE_FIELDS.SENDER_NAME] = data.sender_name;
        }
        if (data.sender_avatar) {
            record[MESSAGE_FIELDS.SENDER_AVATAR] = data.sender_avatar;
        }
        if (data.content !== undefined) {
            record[MESSAGE_FIELDS.CONTENT] = data.content ?? undefined;
        }
        if (data.iv !== undefined) {
            record[MESSAGE_FIELDS.IV] = data.iv ?? undefined;
        }
        if (data.status) {
            record[MESSAGE_FIELDS.STATUS] = data.status;
        }
        if (data.attachments) {
            record[MESSAGE_FIELDS.ATTACHMENTS] = data.attachments;
        }

        // Всегда выставляем тип (по умолчанию text)
        record[MESSAGE_FIELDS.TYPE] = MESSAGE_TYPE.TEXT;

        return record;
    },

    /**
     * Маппинг данных для обновления сообщения из доменной модели в поля PocketBase.
     */
    toUpdateRecord(data: Partial<MessageRow>): Partial<PBMessage> {
        const record: Partial<PBMessage> = {};

        if (data.content !== undefined) {
            record[MESSAGE_FIELDS.CONTENT] = data.content ?? undefined;
        }
        if (data.iv !== undefined) {
            record[MESSAGE_FIELDS.IV] = data.iv ?? undefined;
        }
        if (data.status) {
            record[MESSAGE_FIELDS.STATUS] = data.status;
        }
        if (data.is_edited !== undefined) {
            record[MESSAGE_FIELDS.IS_EDITED] = data.is_edited;
        }
        if (data.is_deleted !== undefined) {
            record[MESSAGE_FIELDS.IS_DELETED] = data.is_deleted;
        }
        if (data.is_starred !== undefined) {
            record[MESSAGE_FIELDS.IS_STARRED] = data.is_starred;
        }
        if (data.metadata !== undefined) {
            record[MESSAGE_FIELDS.METADATA] = data.metadata;
        }

        return record;
    },
};
