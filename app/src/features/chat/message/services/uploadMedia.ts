import type { z } from "zod";
import {
    ATTACHMENT_TYPES,
    DEFAULT_MIME_TYPES,
    MIME_PREFIXES,
    STORAGE_BUCKETS,
} from "@/lib/constants";
import { encryptBlob } from "@/lib/crypto/messages";
import type { messageAttachmentSchema } from "@/lib/schemas/message";
import { supabase } from "@/lib/supabase";

export type Attachment = z.infer<typeof messageAttachmentSchema>;

/** Метка для голосовых сообщений в метаданных */
const VOICE_MESSAGE_LABEL = "Voice Message";

/**
 * Определяет внутренний тип вложения по MIME-типу файла
 */
function determineAttachmentType(mime: string): Attachment["type"] {
    if (mime.startsWith(MIME_PREFIXES.IMAGE)) {
        return ATTACHMENT_TYPES.IMAGE;
    }

    if (mime.startsWith(MIME_PREFIXES.VIDEO)) {
        return ATTACHMENT_TYPES.VIDEO;
    }

    if (mime.startsWith(MIME_PREFIXES.AUDIO)) {
        return ATTACHMENT_TYPES.AUDIO;
    }

    return ATTACHMENT_TYPES.DOCUMENT;
}

/**
 * Загружает публичный медиафайл (картинку/видео/документ) в Supabase Storage.
 * Доступ к файлу ограничен политиками RLS на стороне Supabase (только для участников комнаты).
 * Не использует клиентское шифрование, только HTTPS и RLS.
 *
 * @param file Исходный файл для загрузки
 * @param roomId ID комнаты для формирования пути
 * @returns Метаданные загруженного вложения (Attachment)
 */
export async function uploadMedia(
    file: File | Blob,
    roomId: string,
    fileNameOverride?: string,
): Promise<Attachment> {
    const originalName =
        fileNameOverride || (file instanceof File ? file.name : "file");
    const fileExt = originalName.split(".").pop();
    const uniqueId = crypto.randomUUID();
    const fileName = `${uniqueId}.${fileExt}`;
    const filePath = `${roomId}/${fileName}`;

    const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.CHAT_MEDIA)
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        throw new Error(`Media upload failed: ${error.message}`);
    }

    const {
        data: { publicUrl },
    } = supabase.storage
        .from(STORAGE_BUCKETS.CHAT_MEDIA)
        .getPublicUrl(filePath);

    return {
        id: uniqueId,
        file_name: originalName,
        file_size: file.size,
        content_type: file.type || DEFAULT_MIME_TYPES.OCTET_STREAM,
        url: publicUrl,
        type: determineAttachmentType(file.type),
    };
}

/**
 * Загружает аудиосообщение в Supabase Storage.
 * Аудиосообщения E2E-шифруются симметричным ключом комнаты перед отправкой.
 *
 * @param blob Оригинальный блоб с аудио (например из MediaRecorder)
 * @param roomId ID комнаты для формирования пути
 * @param roomKey Симметричный CryptoKey комнаты для E2E шифрования
 * @returns Метаданные загруженного вложения (Attachment)
 */
export async function uploadAudio(
    blob: Blob,
    roomId: string,
    roomKey: CryptoKey,
): Promise<Attachment> {
    // Шифруем данные E2E ключом
    const encryptedBlob = await encryptBlob(blob, roomKey);

    const uniqueId = crypto.randomUUID();
    const fileName = `${uniqueId}.enc`;
    const filePath = `${roomId}/${fileName}`;

    const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.CHAT_AUDIO)
        .upload(filePath, encryptedBlob, {
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        throw new Error(`Audio upload failed: ${error.message}`);
    }

    const {
        data: { publicUrl },
    } = supabase.storage
        .from(STORAGE_BUCKETS.CHAT_AUDIO)
        .getPublicUrl(filePath);

    return {
        id: uniqueId,
        file_name: VOICE_MESSAGE_LABEL,
        file_size: blob.size, // Сохраняем оригинальный размер для UI
        content_type: blob.type || DEFAULT_MIME_TYPES.WEBM_AUDIO,
        url: publicUrl,
        type: ATTACHMENT_TYPES.AUDIO,
    };
}
