import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
    MEDIA_SYSTEM_CONSTANTS,
    OPTIMISTIC_ID_PREFIX,
    QUERY_KEYS,
} from "../constants";
import { logger } from "../logger";
import { mediaService } from "../services/media";
import type { RecordIdString } from "../types";

type UseMediaProps = {
    /** ID медиа-записи */
    mediaId?: RecordIdString | null;
    /** ID пользователя для изоляции кэша */
    userId?: string | null;
    /** Ключ для расшифровки */
    roomKey?: CryptoKey;
    /** Флаг личного хранилища */
    isVault?: boolean;
    /** Начальный URL (например, временный blob URL для оптимистичных обновлений) */
    initialUrl?: string;
    /** Флаг принудительной загрузки оригинала (например, для автоплея видео или скачивания документов) */
    downloadOriginal?: boolean;
};

type UseMediaResult = {
    /** URL оригинального файла (blob:) */
    objectUrl: string | undefined;
    /** URL превью (blob:) */
    thumbnailUrl: string | undefined;
    /** Статус загрузки */
    isLoading: boolean;
    /** Ошибка, если возникла */
    error: Error | null;
};

/**
 * React-хук для прозрачного получения медиафайлов с поддержкой шифрования и кеширования.
 * Использует @tanstack/react-query для дедупликации запросов и управления состоянием.
 *
 * @param props - { mediaId, userId, roomKey, isVault }
 */
export function useMedia({
    mediaId,
    userId,
    roomKey,
    isVault = false,
    initialUrl,
    downloadOriginal = false,
}: UseMediaProps): UseMediaResult {
    const isOptimistic = mediaId?.startsWith(OPTIMISTIC_ID_PREFIX) || false;

    const queryEnabled =
        !!mediaId && !!userId && (!!roomKey || !!isVault) && !isOptimistic;

    const {
        data: mediaContent,
        isLoading: queryLoading,
        error: queryError,
    } = useQuery({
        queryKey: QUERY_KEYS.media(mediaId, userId),
        queryFn: async () => {
            if (!mediaId || !userId || isOptimistic) {
                return null;
            }

            if (downloadOriginal) {
                const result = await mediaService.ensureOriginal({
                    id: mediaId,
                    userId,
                    roomKey,
                    isVault,
                });

                if (result.isErr()) {
                    logger.error(
                        `useMedia [${mediaId}] (original): ошибка загрузки`,
                        result.error,
                    );
                    throw new Error(result.error.message);
                }

                return result.value;
            }

            // Единая точка входа для получения превью медиа через сервис
            const result = await mediaService.ensureThumbnail({
                id: mediaId,
                userId,
                roomKey,
                isVault,
            });

            if (result.isErr()) {
                logger.error(
                    `useMedia [${mediaId}]: ошибка загрузки`,
                    result.error,
                );
                throw new Error(result.error.message);
            }

            return result.value;
        },
        // Активируем запрос только если есть ID, доступ к ключам и это не временный ID
        enabled: queryEnabled,
        // Кешируем результат
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
    });

    const [urls, setUrls] = useState<{
        objectUrl: string | undefined;
        thumbnailUrl: string | undefined;
    }>({
        objectUrl:
            isOptimistic ||
            initialUrl?.startsWith(MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX)
                ? initialUrl
                : undefined,
        thumbnailUrl: undefined,
    });

    const isLoading = queryEnabled ? queryLoading : false;

    useEffect(() => {
        if (isOptimistic && initialUrl) {
            setUrls({ objectUrl: initialUrl, thumbnailUrl: undefined });
            return;
        }

        if (!mediaContent) {
            setUrls((prev) => {
                if (
                    isLoading &&
                    prev.objectUrl?.startsWith(
                        MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX,
                    )
                ) {
                    return prev;
                }
                return { objectUrl: undefined, thumbnailUrl: undefined };
            });
            return;
        }

        const objectUrl = mediaContent.original
            ? URL.createObjectURL(mediaContent.original)
            : undefined;
        const thumbnailUrl = mediaContent.thumbnail
            ? URL.createObjectURL(mediaContent.thumbnail)
            : undefined;

        setUrls({ objectUrl, thumbnailUrl });

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            if (thumbnailUrl) {
                URL.revokeObjectURL(thumbnailUrl);
            }
        };
    }, [mediaContent, isOptimistic, initialUrl, isLoading]);

    return {
        objectUrl: urls.objectUrl,
        thumbnailUrl: urls.thumbnailUrl,
        isLoading,
        error: queryError,
    };
}
