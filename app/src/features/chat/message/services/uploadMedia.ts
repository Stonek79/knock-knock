import { saveMediaBlob } from "@/lib/cache/media";
import {
    ATTACHMENT_TYPES,
    DEFAULT_MIME_TYPES,
    MEDIA_DEFAULTS,
    MEDIA_FIELDS,
    MIME_PREFIXES,
} from "@/lib/constants";
import { encryptBlob } from "@/lib/crypto/messages";
import { mediaRepository } from "@/lib/repositories/media.repository";
import type { Attachment, AttachmentType } from "@/lib/types/message";

/**
 * Определяет внутренний тип вложения по MIME-типу файла.
 * Возвращает строго типизированный AttachmentType.
 */
function determineAttachmentType(mime: string): AttachmentType {
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
 * Загружает медиафайл в PocketBase.
 * В PocketBase файлы привязаны к записям коллекций.
 * Мы используем коллекцию 'media' как временное/общее хранилище.
 */
export async function uploadMedia(
    file: File | Blob,
    fileNameOverride?: string,
): Promise<Attachment> {
    const originalName =
        fileNameOverride ||
        (file instanceof File ? file.name : MEDIA_DEFAULTS.FALLBACK_FILE_NAME);

    // Подготовка FormData для PocketBase (используем MEDIA_FIELDS.FILE для имени поля)
    const formData = new FormData();
    formData.append(MEDIA_FIELDS.FILE, file, originalName);

    const uploadResult = await mediaRepository.uploadMedia(formData);

    if (uploadResult.isErr()) {
        throw new Error(uploadResult.error.message);
    }

    const record = uploadResult.value;

    // Получаем публичный URL (record.file строго типизирован через PBMediaRecord)
    const publicUrl = mediaRepository.getFileUrl(record, record.file);

    // Сохраняем blob в IndexedDB для кэширования (ускоряет отображение своих файлов)
    await saveMediaBlob(publicUrl, file);

    return {
        id: record.id,
        file_name: originalName,
        file_size: file.size,
        content_type: file.type || DEFAULT_MIME_TYPES.OCTET_STREAM,
        url: publicUrl,
        type: determineAttachmentType(file.type),
    };
}

/**
 * Загружает аудиосообщение в PocketBase.
 * Аудиосообщения E2E-шифруются симметричным ключом комнаты.
 */
export async function uploadAudio(
    blob: Blob,
    _roomId: string,
    roomKey: CryptoKey,
): Promise<Attachment> {
    // Шифруем данные E2E ключом
    const encryptedBlob = await encryptBlob(blob, roomKey);

    // В PocketBase загружаем как .enc файл
    const fileName = `voice_${Date.now()}.enc`;

    // Подготовка FormData для PocketBase (используем MEDIA_FIELDS.FILE для имени поля)
    const formData = new FormData();
    formData.append(MEDIA_FIELDS.FILE, encryptedBlob, fileName);

    const uploadResult = await mediaRepository.uploadMedia(formData);

    if (uploadResult.isErr()) {
        throw new Error(uploadResult.error.message);
    }

    const record = uploadResult.value;
    const publicUrl = mediaRepository.getFileUrl(record, record.file);

    return {
        id: record.id,
        file_name: MEDIA_DEFAULTS.VOICE_MESSAGE_LABEL,
        file_size: blob.size,
        content_type: blob.type || DEFAULT_MIME_TYPES.WEBM_AUDIO,
        url: publicUrl,
        type: ATTACHMENT_TYPES.AUDIO,
    };
}
