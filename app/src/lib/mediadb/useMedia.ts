import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
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
}: UseMediaProps): UseMediaResult {
    const {
        data: mediaContent,
        isLoading,
        error: queryError,
    } = useQuery({
        queryKey: QUERY_KEYS.media(mediaId, userId),
        queryFn: async () => {
            if (!mediaId || !userId) {
                return null;
            }

            // Единая точка входа для получения медиа через сервис
            const result = await mediaService.ensureMedia({
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
        // Активируем запрос только если есть ID и доступ к ключам
        enabled: !!mediaId && !!userId && (!!roomKey || !!isVault),
        // Кешируем результат
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
    });

    /**
     * Создаем Blob URL для отображения.
     * Мы делаем это в useMemo для мгновенного доступа при рендере,
     * но обязаны очистить их в useEffect.
     */
    const urls = useMemo(() => {
        if (!mediaContent) {
            return { objectUrl: undefined, thumbnailUrl: undefined };
        }

        const objectUrl = mediaContent.original
            ? URL.createObjectURL(mediaContent.original)
            : undefined;
        const thumbnailUrl = mediaContent.thumbnail
            ? URL.createObjectURL(mediaContent.thumbnail)
            : undefined;

        return { objectUrl, thumbnailUrl };
    }, [mediaContent]);

    /**
     * Очистка созданных Blob URL при смене контента или размонтировании.
     */
    useEffect(() => {
        return () => {
            if (urls.objectUrl) {
                URL.revokeObjectURL(urls.objectUrl);
            }
            if (urls.thumbnailUrl) {
                URL.revokeObjectURL(urls.thumbnailUrl);
            }
        };
    }, [urls]);

    return {
        objectUrl: urls.objectUrl,
        thumbnailUrl: urls.thumbnailUrl,
        isLoading,
        error: queryError,
    };
}
