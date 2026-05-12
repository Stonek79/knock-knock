import { MESSAGE_FIELDS, MESSAGE_STATUS, MESSAGE_TYPE } from "../../constants";
import {
    messageAttachmentSchema,
    messageMetadataSchema,
    reactionsSummarySchema,
} from "../../schemas/message";
import type {
    Attachment,
    MessageRow,
    MessageStatus,
    PBMessage,
} from "../../types";

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
                return result.success ? result.data : null;
            })
            .filter((item): item is Attachment => item !== null);
        return parsed.length > 0 ? parsed : null;
    },

    /**
     * Маппинг сырого рекорда PocketBase в доменную модель приложения.
     * Теперь мы просто расширяем нативный тип, не переименовывая поля.
     */
    toRow(record: PBMessage): MessageRow {
        const metadata = messageMetadataSchema.parse(record.metadata || {});

        const reactions_summary =
            reactionsSummarySchema.parse(record.reactions_summary) ?? {};

        return {
            ...record,
            // Добавляем profiles для UI
            profiles: {
                display_name: record.sender_name,
                avatar_url: record.sender_avatar,
            },
            attachments: this.parseAttachments(record.attachments),
            metadata,
            reactions_summary,
        };
    },

    /**
     * Маппинг данных для создания сообщения из доменной модели в поля PocketBase.
     */
    toCreateRecord(data: Partial<MessageRow>): Partial<PBMessage> {
        const record: Partial<PBMessage> = {
            ...data,
        };

        // Всегда выставляем тип (по умолчанию text), если не задан
        if (!record[MESSAGE_FIELDS.TYPE]) {
            record[MESSAGE_FIELDS.TYPE] = MESSAGE_TYPE.TEXT;
        }

        return record;
    },

    /**
     * Маппинг данных для обновления сообщения из доменной модели в поля PocketBase.
     */
    toUpdateRecord(data: Partial<MessageRow>): Partial<PBMessage> {
        // В новом подходе маппинг почти не нужен, так как имена полей совпадают
        return { ...data };
    },
};
