import type { z } from "zod";
import type {
    mediaCacheSchema,
    mediaMetadataSchema,
    mediaReferenceSchema,
    mediaSchema,
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
 * ТИП ДЛЯ ОБРАБОТАННЫХ ДАННЫХ (для UI компонентов)
 */
export type ProcessedMediaData = {
    original: Blob | null;
    thumbnail: Blob | null;
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
