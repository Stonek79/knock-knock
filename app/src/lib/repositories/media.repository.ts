import { ERROR_CODES, STORAGE_CONFIG } from "../constants";
import { pb } from "../pocketbase";
import type { MediaRepoError, MediaResponse } from "../types";
import { appError, fromPromise, type Result } from "../utils/result";

/**
 * РЕПОЗИТОРИЙ МЕДИА-ФАЙЛОВ
 * Централизованная работа с коллекцией 'media' и файлами в PocketBase.
 * Обеспечивает строгую типизацию на основе сгенерированных схем БД.
 */
export const mediaRepository = {
    /**
     * Загрузка файла в коллекцию 'media'.
     * @param formData Подготовленный FormData с файлом и метаданными
     * @returns Result с записью MediaResponse или ошибкой AppError
     */
    uploadMedia: async (
        formData: FormData,
    ): Promise<Result<MediaResponse, MediaRepoError>> => {
        return fromPromise(
            pb
                .collection(STORAGE_CONFIG.MEDIA_COLLECTION)
                .create<MediaResponse>(formData),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.UPLOAD_ERROR,
                    "Ошибка при загрузке медиафайла в облачное хранилище",
                    e,
                );
            },
        );
    },

    /**
     * Получение метаданных записи медиа по ID.
     * @param id ID записи в PocketBase
     * @returns Result с MediaResponse или AppError
     */
    getMediaRecord: async (
        id: string,
    ): Promise<Result<MediaResponse, MediaRepoError>> => {
        return fromPromise(
            pb
                .collection(STORAGE_CONFIG.MEDIA_COLLECTION)
                .getOne<MediaResponse>(id),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.DB_ERROR,
                    "Ошибка получения записи медиа из базы данных",
                    e,
                );
            },
        );
    },

    /**
     * Получение публичного URL файла из PocketBase.
     * @param params { record, filename }
     * @returns Строка с URL файла
     */
    getFileUrl: ({
        record,
        filename,
    }: {
        record: MediaResponse;
        filename: string;
    }): string => {
        return pb.files.getURL(record, filename);
    },
};
