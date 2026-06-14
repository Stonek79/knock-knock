import type { z } from "zod";
import type {
    lightboxImageSlideSchema,
    lightboxSlideSchema,
    lightboxVideoSlideSchema,
    mediaCacheSchema,
    mediaMetadataSchema,
    mediaReferenceSchema,
    mediaSchema,
    mediaWorkerPayloadSchema,
    mediaWorkerResponseSchema,
    mediaWorkerTaskSchema,
} from "../schemas/media";

/**
 * МЕТАДАННЫЕ МЕДИА
 */
export type MediaMetadata = z.infer<typeof mediaMetadataSchema>;

/**
 * ЗАПИСЬ МЕДИА (PocketBase)
 */
export type MediaItem = z.infer<typeof mediaSchema>;

/**
 * ССЫЛКА НА МЕДИА
 */
export type MediaReference = z.infer<typeof mediaReferenceSchema>;

/**
 * ЗАПИСЬ В ЛОКАЛЬНОМ КЭШЕ (Dexie)
 */
export type MediaCacheItem = z.infer<typeof mediaCacheSchema>;

/**
 * СТРУКТУРА ЗАДАЧИ ДЛЯ ВОРКЕРА
 */
export type WorkerTask = z.infer<typeof mediaWorkerTaskSchema>;

/**
 * РЕЗУЛЬТАТ ВЫПОЛНЕНИЯ ЗАДАЧИ В ВОРКЕРЕ
 */
export type WorkerProcessResult = z.infer<typeof mediaWorkerResponseSchema>;

/**
 * ТИП ДАННЫХ ДЛЯ ПЕРЕДАЧИ ИЗ ВОРКЕРА
 */
export type WorkerMediaPayload = z.infer<typeof mediaWorkerPayloadSchema> & {
    plainOriginal?: Blob;
    plainThumbnail?: Blob;
};

/**
 * ТИП ДЛЯ ОБРАБОТАННЫХ ДАННЫХ (для UI компонентов)
 */
export type ProcessedMediaData = {
    original: Blob | null;
    thumbnail: Blob | null;
    metadata?: MediaMetadata | null;
};

/**
 * ПАРАМЕТРЫ ЗАГРУЗКИ (для сервиса)
 */
export type MediaUploadParams = {
    file: Blob | File;
    userId: string;
    roomId: string;
    cryptoKey: CryptoKey;
    isVault?: boolean;
};

/**
 * ТИПЫ СЛАЙДОВ ДЛЯ LIGHTBOX (ZoomBlock)
 */
export type LightboxSlide = z.infer<typeof lightboxSlideSchema>;
export type LightboxImageSlide = z.infer<typeof lightboxImageSlideSchema>;
export type LightboxVideoSlide = z.infer<typeof lightboxVideoSlideSchema>;
