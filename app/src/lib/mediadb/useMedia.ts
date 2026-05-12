import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { QUERY_KEYS } from "../constants";
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
}: UseMediaProps): UseMediaResult {
    const isOptimistic = mediaId?.startsWith("temp-");

    const {
        data: mediaContent,
        isLoading,
        error: queryError,
    } = useQuery({
        queryKey: QUERY_KEYS.media(mediaId, userId),
        queryFn: async () => {
            if (!mediaId || !userId || isOptimistic) {
                return null;
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
        enabled:
            !!mediaId && !!userId && (!!roomKey || !!isVault) && !isOptimistic,
        // Кешируем результат
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
    });

    /**
     * Храним сгенерированные URL в стейте, чтобы они гарантированно
     * создавались заново при монтировании компонента (решает проблему React Query кэша).
     */
    // const urls = useMemo(() => {
    // 	// Если это оптимистичное сообщение, просто возвращаем переданный URL
    // 	if (isOptimistic && initialUrl) {
    // 		return {
    // 			objectUrl: initialUrl,
    // 			thumbnailUrl: undefined,
    // 			isFromInitial: true,
    // 		};
    // 	}

    // 	if (!mediaContent) {
    // 		return {
    // 			objectUrl: undefined,
    // 			thumbnailUrl: undefined,
    // 			isFromInitial: false,
    // 		};
    // 	}

    // 	const objectUrl = mediaContent.original
    // 		? URL.createObjectURL(mediaContent.original)
    // 		: undefined;
    // 	const thumbnailUrl = mediaContent.thumbnail
    // 		? URL.createObjectURL(mediaContent.thumbnail)
    // 		: undefined;

    // 	return { objectUrl, thumbnailUrl, isFromInitial: false };
    // }, [mediaContent, isOptimistic, initialUrl]);

    /**
     * Очистка созданных Blob URL при смене контента или размонтировании.
     * Очищаем только те, что создали сами (не initialUrl).
     */
    // useEffect(() => {
    // 	return () => {
    // 		if (!urls.isFromInitial) {
    // 			if (urls.objectUrl) {
    // 				URL.revokeObjectURL(urls.objectUrl);
    // 			}
    // 			if (urls.thumbnailUrl) {
    // 				URL.revokeObjectURL(urls.thumbnailUrl);
    // 			}
    // 		}
    // 	};
    // }, [urls]);

    const [urls, setUrls] = useState<{
        objectUrl: string | undefined;
        thumbnailUrl: string | undefined;
    }>({
        objectUrl: isOptimistic ? initialUrl : undefined,
        thumbnailUrl: undefined,
    });

    useEffect(() => {
        if (isOptimistic && initialUrl) {
            setUrls({ objectUrl: initialUrl, thumbnailUrl: undefined });
            return;
        }

        if (!mediaContent) {
            setUrls({ objectUrl: undefined, thumbnailUrl: undefined });
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
    }, [mediaContent, isOptimistic, initialUrl]);

    return {
        objectUrl: urls.objectUrl,
        thumbnailUrl: urls.thumbnailUrl,
        isLoading,
        error: queryError,
    };
}
