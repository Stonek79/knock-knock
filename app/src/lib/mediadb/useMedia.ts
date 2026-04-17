import { useEffect, useState } from "react";
import { logger } from "../logger";
import { pb } from "../pocketbase";
import { mediaService } from "../services/media";
import type { RecordIdString } from "../types";

type UseMediaProps = {
    mediaId?: RecordIdString | null;
    roomKey?: CryptoKey;
    isVault?: boolean;
};

type UseMediaResult = {
    /** URL оригинального файла ( blob: ) */
    objectUrl: string | undefined;
    /** URL превью ( blob: ) */
    thumbnailUrl: string | undefined;
    /** Статус загрузки */
    isLoading: boolean;
    /** Ошибка, если возникла */
    error: Error | null;
};

/**
 * React-хук для прозрачного получения медиафайлов с поддержкой шифрования и кеширования.
 * Реализует Offline-First подход:
 * 1. Ищет файл в локальном кеше (Dexie).
 * 2. Если нет в кеше — скачивает зашифрованный файл из PocketBase.
 * 3. Расшифровывает в Worker и сохраняет в кеш.
 *
 * @param props - { mediaId, roomKey, isVault }
 */
export function useMedia({
    mediaId,
    roomKey,
    isVault = false,
}: UseMediaProps): UseMediaResult {
    const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(
        undefined,
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;
        let activeOriginalUrl: string | null = null;
        let activeThumbnailUrl: string | null = null;

        const cleanup = () => {
            if (activeOriginalUrl) {
                URL.revokeObjectURL(activeOriginalUrl);
                activeOriginalUrl = null;
            }
            if (activeThumbnailUrl) {
                URL.revokeObjectURL(activeThumbnailUrl);
                activeThumbnailUrl = null;
            }
        };

        const load = async () => {
            if (!mediaId) {
                setObjectUrl(undefined);
                setThumbnailUrl(undefined);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const userId = pb.authStore.model?.id;
                if (!userId) {
                    throw new Error("Пользователь не авторизован");
                }

                // Единая точка входа для получения медиа
                const result = await mediaService.ensureMedia({
                    id: mediaId,
                    userId,
                    roomKey,
                    isVault,
                });

                if (result.isErr()) {
                    throw new Error(result.error.message);
                }

                const mediaContent = result.value;

                if (isMounted && mediaContent) {
                    cleanup(); // Очищаем старые URL

                    if (mediaContent.original) {
                        activeOriginalUrl = URL.createObjectURL(
                            mediaContent.original,
                        );
                        setObjectUrl(activeOriginalUrl);
                    }

                    if (mediaContent.thumbnail) {
                        activeThumbnailUrl = URL.createObjectURL(
                            mediaContent.thumbnail,
                        );
                        setThumbnailUrl(activeThumbnailUrl);
                    }
                }
            } catch (err) {
                if (isMounted) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : "Неизвестная ошибка загрузки медиа";
                    logger.error(
                        `useMedia [${mediaId}]: media loading failed`,
                        err,
                    );
                    setError(err instanceof Error ? err : new Error(message));
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        load();

        return () => {
            isMounted = false;
            cleanup();
        };
    }, [mediaId, roomKey, isVault]);

    return { objectUrl, thumbnailUrl, isLoading, error };
}
