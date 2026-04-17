import {
    COMPRESSION_OPTIONS,
    MEDIA_ERROR_MESSAGES,
    MEDIA_SYSTEM_CONSTANTS,
    MEDIA_WORKER_ACTIONS,
} from "../constants";
import { mediaWorkerTaskSchema } from "../schemas/media";
import type { WorkerMediaPayload, WorkerProcessResult } from "../types";

/**
 * МЕДИА-ВОРКЕР (Media Vault v3)
 * Отвечает за тяжелые операции:
 * 1. Сжатие изображений перед шифрованием.
 * 2. Мультиплексирование видео.
 * 3. Шифрование/Расшифровка Blob.
 */

self.onmessage = async (e: MessageEvent<unknown>) => {
    const result = mediaWorkerTaskSchema.safeParse(e.data);

    if (!result.success) {
        self.postMessage({
            taskId:
                ((e.data as Record<string, unknown>)?.taskId as string) ||
                "unknown",
            success: false,
            error: MEDIA_ERROR_MESSAGES.WORKER_PROCESS_FAIL,
        } as WorkerProcessResult);
        return;
    }

    const { taskId, action, payload, cryptoKey } = result.data;

    try {
        let processResult: WorkerMediaPayload;

        switch (action) {
            case MEDIA_WORKER_ACTIONS.COMPRESS_IMAGE:
                processResult = await compressImage({
                    blob: payload as Blob,
                    key: cryptoKey,
                });
                break;
            case MEDIA_WORKER_ACTIONS.ENCRYPT_BLOB:
                processResult = await encryptBlob({
                    blob: payload as Blob,
                    key: cryptoKey,
                });
                break;
            case MEDIA_WORKER_ACTIONS.DECRYPT_BLOB:
                processResult = await decryptBlob({
                    blob: payload as Blob,
                    key: cryptoKey,
                });
                break;
            default:
                throw new Error(`Неподдерживаемое действие: ${action}`);
        }

        self.postMessage({
            taskId,
            success: true,
            data: processResult,
        } as WorkerProcessResult);
    } catch (error) {
        self.postMessage({
            taskId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        } as WorkerProcessResult);
    }
};

/**
 * Сжатие изображения и генерация превью + шифрование.
 */
async function compressImage({
    blob,
    key,
}: {
    blob: Blob;
    key?: CryptoKey;
}): Promise<WorkerMediaPayload> {
    // 1. Создание ImageBitmap для работы с OffscreenCanvas
    const bitmap = await createImageBitmap(blob);
    const { width, height } = bitmap;

    // 2. Сжатие оригинала (если нужно)
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext(MEDIA_SYSTEM_CONSTANTS.CANVAS_CONTEXT_2D);
    if (!ctx) {
        throw new Error("Could not get canvas context");
    }
    ctx.drawImage(bitmap, 0, 0);

    const compressedBlob = await canvas.convertToBlob({
        type: COMPRESSION_OPTIONS.FORMAT_WEBP,
        quality: COMPRESSION_OPTIONS.QUALITY,
    });

    // 3. Создание превью
    const thumbScale = Math.min(
        COMPRESSION_OPTIONS.THUMB_WIDTH_OR_HEIGHT / width,
        1,
    );
    const thumbWidth = width * thumbScale;
    const thumbHeight = height * thumbScale;

    const thumbCanvas = new OffscreenCanvas(thumbWidth, thumbHeight);
    const thumbCtx = thumbCanvas.getContext(
        MEDIA_SYSTEM_CONSTANTS.CANVAS_CONTEXT_2D,
    );
    if (!thumbCtx) {
        throw new Error("Could not get thumb context");
    }
    thumbCtx.drawImage(bitmap, 0, 0, thumbWidth, thumbHeight);

    const thumbBlob = await thumbCanvas.convertToBlob({
        type: COMPRESSION_OPTIONS.FORMAT_WEBP,
        quality: COMPRESSION_OPTIONS.THUMB_QUALITY,
    });

    // 4. Шифрование (если ключ передан)
    if (key) {
        const [encOriginal, encThumb] = await Promise.all([
            encryptData({ blob: compressedBlob, key }),
            encryptData({ blob: thumbBlob, key }),
        ]);
        return {
            original: encOriginal,
            thumbnail: encThumb,
            metadata: { width, height },
        };
    }

    return {
        original: compressedBlob,
        thumbnail: thumbBlob,
        metadata: { width, height },
    };
}

/**
 * Шифрование произвольного Blob.
 */
async function encryptBlob({
    blob,
    key,
}: {
    blob: Blob;
    key?: CryptoKey;
}): Promise<WorkerMediaPayload> {
    if (!key) {
        return { original: blob };
    }
    const encrypted = await encryptData({ blob, key });
    return { original: encrypted };
}

/**
 * Расшифровка Blob.
 */
async function decryptBlob({
    blob,
    key,
}: {
    blob: Blob;
    key?: CryptoKey;
}): Promise<WorkerMediaPayload> {
    if (!key) {
        return { original: blob };
    }

    const res = await decryptData({ blob, key });
    return { original: res };
}

/**
 * AES-GCM шифрование.
 */
async function encryptData({
    blob,
    key,
}: {
    blob: Blob;
    key: CryptoKey;
}): Promise<Blob> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const buffer = await blob.arrayBuffer();
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        buffer,
    );

    // Склеиваем IV + данные для хранения в одном файле
    return new Blob([iv, encrypted], { type: blob.type });
}

/**
 * AES-GCM расшифровка.
 */
async function decryptData({
    blob,
    key,
}: {
    blob: Blob;
    key: CryptoKey;
}): Promise<Blob> {
    const buffer = await blob.arrayBuffer();
    const iv = buffer.slice(0, 12);
    const data = buffer.slice(12);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        data,
    );

    return new Blob([decrypted], { type: blob.type });
}
