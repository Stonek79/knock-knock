import { clear, createStore, del, get, keys, set } from "idb-keyval";
import { useEffect, useState } from "react";
import { CACHE_CONSTANTS } from "@/lib/constants";
import { logger } from "@/lib/logger";

// Создаем отдельное хранилище для медиа
const customStore = createStore(
    CACHE_CONSTANTS.DB_NAME,
    CACHE_CONSTANTS.STORE_NAME,
);

/**
 * Сохраняет Blob файла в кэш IndexedDB по заданному URL.
 * Вызывается сразу после успешной загрузки файла на сервер (eager caching) или
 * после первого скачивания в компоненте, чтобы избежать повторных загрузок.
 *
 * @param url Стабильный URL загруженного файла (publicUrl от Supabase)
 * @param blob Непосредственно бинарные данные (для аудио - зашифрованный Blob)
 * @returns Промис, который резолвится после сохранения
 */
export async function saveMediaBlob(url: string, blob: Blob): Promise<void> {
    try {
        await set(url, blob, customStore);
        logger.debug(`${CACHE_CONSTANTS.LOG_PREFIX} Saved blob for ${url}`);
    } catch (e) {
        logger.error(
            `${CACHE_CONSTANTS.LOG_PREFIX} Failed to save blob for ${url}`,
            e,
        );
    }
}

/**
 * Извлекает Blob из кэша IndexedDB по URL.
 * Применяется перед любыми сетевыми запросами к медиафайлам,
 * обеспечивая оффлайн-доступность и моментальную отрисовку ранее загруженных файлов.
 *
 * @param url Стабильный URL загруженного файла
 * @returns Blob, если файл найден в кэше, иначе undefined
 */
export async function getMediaBlob(url: string): Promise<Blob | undefined> {
    try {
        const blob = await get<Blob>(url, customStore);
        if (blob) {
            logger.debug(`${CACHE_CONSTANTS.LOG_PREFIX} Cache HIT for ${url}`);
        }
        return blob;
    } catch (e) {
        logger.error(
            `${CACHE_CONSTANTS.LOG_PREFIX} Failed to get blob for ${url}`,
            e,
        );
        return undefined;
    }
}

/**
 * Удаляет конкретный медиафайл из кэша по его URL.
 * Следует вызывать при удалении сообщения в чате для освобождения памяти.
 *
 * @param url Стабильный URL файла, который нужно удалить из кэша
 */
export async function deleteMediaBlob(url: string): Promise<void> {
    try {
        await del(url, customStore);
    } catch (e) {
        logger.error(
            `${CACHE_CONSTANTS.LOG_PREFIX} Failed to delete blob for ${url}`,
            e,
        );
    }
}

/**
 * Полностью очищает хранилище медиафайлов (IndexedDB).
 * Вызывается из раздела "Настройки -> Хранилище" (StorageSettings).
 * Удаляются все картинки и аудио, при следующем открытии чата они будут
 * загружены с сервера заново.
 */
export async function clearMediaCache(): Promise<void> {
    try {
        await clear(customStore);
        logger.info(`${CACHE_CONSTANTS.LOG_PREFIX} Cleared all media`);
    } catch (e) {
        logger.error(
            `${CACHE_CONSTANTS.LOG_PREFIX} Failed to clear media cache`,
            e,
        );
    }
}

/**
 * Возвращает текущий размер кэша медиа в байтах.
 * Читает все файлы подряд (может занять время на слабых устройствах).
 *
 * @returns Суммарный размер в байтах (number)
 */
export async function getMediaCacheSize(): Promise<number> {
    try {
        const allKeys = await keys(customStore);
        let totalBytes = 0;
        for (const key of allKeys) {
            const blob = await get<Blob>(key, customStore);
            if (blob) {
                totalBytes += blob.size;
            }
        }
        return totalBytes;
    } catch (e) {
        logger.error(
            `${CACHE_CONSTANTS.LOG_PREFIX} Failed to calculate cache size`,
            e,
        );
        return 0;
    }
}

/**
 * React хук для прозрачной загрузки и кэширования медиафайлов (картинок, видео).
 * Сначала проверяет IndexedDB, и только если пусто - делает fetch запросом.
 * Автоматически управляет URL.createObjectURL и очисткой памяти (`revokeObjectURL`).
 *
 * @param url Оригинальный URL вложения (например, пуб. URL из Supabase)
 * @returns Объект состояний: `objectUrl` (локальная или кэш-ссылка), статус загрузки и ошибки
 */
export function useCachedMedia(url?: string | null) {
    const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;
        let activeObjectUrl: string | null = null;

        const loadMedia = async () => {
            if (!url) {
                setObjectUrl(undefined);
                return;
            }

            setIsLoading(true);
            setIsError(false);

            try {
                // Для mock-storage: URL используем ключ напрямую (без префикса)
                const cacheKey = url.startsWith("mock-storage:")
                    ? url.replace("mock-storage:", "")
                    : url;

                // 1. Проверяем кэш
                let blob = await getMediaBlob(cacheKey);

                // 2. Если нет в кэше — качаем из сети (только для production URL)
                if (!blob && !url.startsWith("mock-storage:")) {
                    logger.debug(
                        `${CACHE_CONSTANTS.LOG_PREFIX} Cache MISS for ${url}, fetching...`,
                    );
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(
                            `Failed to fetch media: ${response.status}`,
                        );
                    }
                    blob = await response.blob();

                    // 3. Сохраняем в кэш
                    await saveMediaBlob(cacheKey, blob);
                }

                if (isMounted && blob) {
                    activeObjectUrl = URL.createObjectURL(blob);
                    setObjectUrl(activeObjectUrl);
                } else if (!blob && url.startsWith("mock-storage:")) {
                    // Файл не найден в IndexedDB (после перезагрузки в mock-режиме)
                    logger.warn(
                        `${CACHE_CONSTANTS.LOG_PREFIX} Mock file not found in cache: ${cacheKey}`,
                    );
                    if (isMounted) {
                        setIsError(true);
                        setObjectUrl(undefined);
                    }
                }
            } catch (e) {
                logger.error(
                    `${CACHE_CONSTANTS.LOG_PREFIX} Error loading media ${url}`,
                    e,
                );
                if (isMounted) {
                    setIsError(true);
                    setObjectUrl(undefined);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadMedia();

        return () => {
            isMounted = false;
            // НЕ отзываем objectUrl сразу при размонтировании!
            // Это вызывает проблемы при переходе между чатами.
            // URL будет отозван только при изменении url или при полной очистке кэша.
            // if (activeObjectUrl) {
            //     URL.revokeObjectURL(activeObjectUrl);
            // }
        };
    }, [url]);

    return { objectUrl, isLoading, isError };
}
