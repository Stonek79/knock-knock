import {
    ATTACHMENT_TYPES,
    DEFAULT_MIME_TYPES,
    MIME_PREFIXES,
    OPTIMISTIC_ID_PREFIX,
} from "@/lib/constants";
import { mediaService } from "@/lib/services/media";
import type { Attachment } from "@/lib/types";

const DEFAULT_AUDIO_NAME = "voice-message";
const DEFAULT_VIDEO_NAME = "video-message.webm";

export type UploadMessageMediaParams = {
    audioBlob?: Blob;
    videoBlob?: Blob;
    files?: File[];
    userId: string;
    roomId: string;
    cryptoKey: CryptoKey;
};

/**
 * Загружает медиафайлы (аудио, видео, документы) в хранилище
 * и возвращает массив Attachment для прикрепления к сообщению.
 */
export async function uploadMessageMedia({
    audioBlob,
    videoBlob,
    files,
    userId,
    roomId,
    cryptoKey,
}: UploadMessageMediaParams): Promise<Attachment[]> {
    const attachments: Attachment[] = [];

    if (audioBlob) {
        const uploadResult = await mediaService.uploadMedia({
            file: audioBlob,
            userId,
            roomId,
            cryptoKey,
        });

        if (uploadResult.isErr()) {
            throw new Error(uploadResult.error.message);
        }

        const record = uploadResult.value;
        const isMp4 = audioBlob.type.includes("mp4");
        const extension = isMp4 ? "m4a" : "webm";

        attachments.push({
            id: record.id,
            file_name: `${DEFAULT_AUDIO_NAME}.${extension}`,
            file_size: audioBlob.size,
            content_type: audioBlob.type || DEFAULT_MIME_TYPES.WEBM_AUDIO,
            url: mediaService.getFileUrl(record, record.file),
            type: ATTACHMENT_TYPES.AUDIO,
        });
    }

    if (videoBlob) {
        const uploadResult = await mediaService.uploadMedia({
            file: videoBlob,
            userId,
            roomId,
            cryptoKey,
        });

        if (uploadResult.isErr()) {
            throw new Error(uploadResult.error.message);
        }

        const record = uploadResult.value;

        attachments.push({
            id: record.id,
            file_name: DEFAULT_VIDEO_NAME,
            file_size: videoBlob.size,
            content_type: videoBlob.type || DEFAULT_MIME_TYPES.WEBM_VIDEO,
            url: mediaService.getFileUrl(record, record.file),
            type: ATTACHMENT_TYPES.VIDEO,
        });
    }

    if (files && files.length > 0) {
        const uploadPromises = files.map(async (file): Promise<Attachment> => {
            const uploadResult = await mediaService.uploadMedia({
                file,
                userId,
                roomId,
                cryptoKey,
            });

            if (uploadResult.isErr()) {
                throw new Error(uploadResult.error.message);
            }

            const record = uploadResult.value;

            const type = file.type.startsWith(MIME_PREFIXES.IMAGE)
                ? ATTACHMENT_TYPES.IMAGE
                : file.type.startsWith(MIME_PREFIXES.VIDEO)
                  ? ATTACHMENT_TYPES.VIDEO
                  : ATTACHMENT_TYPES.DOCUMENT;

            return {
                id: record.id,
                file_name: file.name,
                file_size: file.size,
                content_type: file.type,
                url: mediaService.getFileUrl(record, record.file),
                thumbnail_url: record.thumbnail
                    ? mediaService.getFileUrl(record, record.thumbnail)
                    : undefined,
                type,
            };
        });

        const uploaded = await Promise.all(uploadPromises);
        attachments.push(...uploaded);
    }

    return attachments;
}

/**
 * Генерирует временные объекты Attachment для оптимистичного UI.
 */
export function generateOptimisticAttachments({
    tempId,
    audioBlob,
    videoBlob,
    files,
}: {
    tempId: string;
    audioBlob?: Blob;
    videoBlob?: Blob;
    files?: File[];
}): { attachments: Attachment[]; blobUrls: string[] } {
    const blobUrls: string[] = [];
    const attachments: Attachment[] = [];

    if (audioBlob) {
        const blobUrl = URL.createObjectURL(audioBlob);
        blobUrls.push(blobUrl);

        const isMp4 = audioBlob.type.includes("mp4");
        const extension = isMp4 ? "m4a" : "webm";

        attachments.push({
            id: `${OPTIMISTIC_ID_PREFIX}audio-${tempId}`,
            file_name: `${DEFAULT_AUDIO_NAME}.${extension}`,
            file_size: audioBlob.size,
            content_type: DEFAULT_MIME_TYPES.WEBM_AUDIO,
            url: blobUrl,
            type: ATTACHMENT_TYPES.AUDIO,
        });
    }

    if (videoBlob) {
        const blobUrl = URL.createObjectURL(videoBlob);
        blobUrls.push(blobUrl);
        attachments.push({
            id: `temp_video_${tempId}`,
            file_name: DEFAULT_VIDEO_NAME,
            file_size: videoBlob.size,
            content_type: videoBlob.type || DEFAULT_MIME_TYPES.WEBM_VIDEO,
            url: blobUrl,
            type: ATTACHMENT_TYPES.VIDEO,
        });
    }

    if (files) {
        for (const file of files) {
            const blobUrl = URL.createObjectURL(file);
            blobUrls.push(blobUrl);

            const type = file.type.startsWith(MIME_PREFIXES.IMAGE)
                ? ATTACHMENT_TYPES.IMAGE
                : file.type.startsWith(MIME_PREFIXES.VIDEO)
                  ? ATTACHMENT_TYPES.VIDEO
                  : ATTACHMENT_TYPES.DOCUMENT;

            attachments.push({
                id: `${OPTIMISTIC_ID_PREFIX}file-${tempId}-${file.name}`,
                file_name: file.name,
                file_size: file.size,
                content_type: file.type,
                url: blobUrl,
                type,
            });
        }
    }

    return { attachments, blobUrls };
}
