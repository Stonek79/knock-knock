import { ERROR_CODES, STORAGE_CONFIG } from "../constants";
import { pb } from "../pocketbase";
import type { MediaRepoError, PBRecord } from "../types";
import { appError, fromPromise, type Result } from "../utils/result";

/**
 * РЕПОЗИТОРИЙ МЕДИА-ФАЙЛОВ
 * Централизованная работа с коллекцией 'media' и файлами.
 */
export const mediaRepository = {
    /**
     * Загрузка файла в коллекцию 'media'
     */
    uploadMedia: async (
        formData: FormData,
    ): Promise<Result<PBRecord, MediaRepoError>> => {
        return fromPromise(
            pb
                .collection(STORAGE_CONFIG.MEDIA_COLLECTION)
                .create<PBRecord>(formData),
            (e: unknown) => {
                return appError(
                    ERROR_CODES.UPLOAD_ERROR,
                    "Ошибка при загрузке медиафайла",
                    e,
                );
            },
        );
    },

    /**
     * Получение публичного URL файла
     */
    getFileUrl: (record: PBRecord, filename: string): string => {
        // Используем сигнатуру SDK
        return pb.files.getURL(record, filename);
    },
};
