import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { MEDIA_SYSTEM_CONSTANTS, QUERY_KEYS } from "@/lib/constants";
import { mediaService } from "@/lib/services/media";
import type { Attachment, RecordIdString } from "@/lib/types";

interface UseLightboxSlidesProps {
    /** Список вложений (изображений) */
    attachments: Attachment[];
    /** ID пользователя для изоляции кэша */
    userId: string;
    /** Ключ комнаты для расшифровки */
    roomKey?: CryptoKey;
    /** Флаг активации загрузки (когда лайтбокс открыт) */
    enabled: boolean;
}

/**
 * Хук для управления слайдами Lightbox.
 * Обеспечивает дешифрование оригиналов изображений при открытии просмотра.
 */
export function useLightboxSlides({
    attachments,
    userId,
    roomKey,
    enabled,
}: UseLightboxSlidesProps) {
    const [dimensions, setDimensions] = useState<
        Record<string, { width: number; height: number }>
    >({});
    const loadingDimensionsRef = useRef<Set<string>>(new Set());
    const urlsRef = useRef<Record<string, string>>({});
    const [urls, setUrls] = useState<Record<string, string>>({});

    const results = useQueries({
        queries: attachments.map((att) => ({
            queryKey: QUERY_KEYS.media(att.id as RecordIdString, userId),
            queryFn: async () => {
                const result = await mediaService.ensureOriginal({
                    id: att.id,
                    userId,
                    roomKey,
                });

                if (result.isErr()) {
                    throw new Error(result.error.message);
                }

                return result.value;
            },
            // Загружаем оригиналы только когда лайтбокс открыт
            enabled: enabled && !!att.id && !!userId,
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
        })),
    });

    /**
     * Создаем Blob URL-ы.
     */
    useEffect(() => {
        let hasNew = false;
        const newUrls: Record<string, string> = {};

        attachments.forEach((att, index) => {
            const res = results[index];
            const blob = res.data?.original;

            if (blob && !urlsRef.current[att.id]) {
                const objUrl = URL.createObjectURL(blob);
                urlsRef.current[att.id] = objUrl; // Синхронизируем Ref для очистки при размонтировании
                newUrls[att.id] = objUrl; // Собираем новые ссылки для стейта
                hasNew = true;
            }
        });

        if (hasNew) {
            setUrls((prev) => ({ ...prev, ...newUrls }));
        }
    }, [results, attachments]);

    /**
     * Формируем промежуточный массив с URL-ами.
     */
    const slidesWithUrls = useMemo(() => {
        return attachments.map((att) => ({
            att,
            src: urls[att.id] || "",
        }));
    }, [attachments, urls]);

    /**
     * Извлекаем реальные размеры изображений для корректной работы плагина Zoom.
     */
    useEffect(() => {
        const preloadingImages: HTMLImageElement[] = [];

        slidesWithUrls.forEach(({ att, src }) => {
            if (src && !loadingDimensionsRef.current.has(att.id)) {
                loadingDimensionsRef.current.add(att.id);
                const img = new Image();
                preloadingImages.push(img);
                img.onload = () => {
                    setDimensions((prev) => ({
                        ...prev,
                        [att.id]: {
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                        },
                    }));
                };
                img.src = src;
            }
        });

        return () => {
            preloadingImages.forEach((img) => {
                if (img.src) {
                    img.onload = null;
                    img.onerror = null;
                    img.src = "";
                }
            });
        };
    }, [slidesWithUrls]);

    /**
     * Очистка Blob URL при размонтировании компонента.
     */
    useEffect(() => {
        const currentUrls = urlsRef.current;

        return () => {
            for (const id in currentUrls) {
                const url = currentUrls[id];
                if (
                    url.startsWith("blob:") ||
                    url.startsWith(MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX)
                ) {
                    URL.revokeObjectURL(url);
                }
            }

            // Обязательно очищаем ref, чтобы при повторном монтировании генерировались новые ссылки
            urlsRef.current = {};
            loadingDimensionsRef.current.clear();
        };
    }, []);

    const finalSlides = useMemo(() => {
        return slidesWithUrls.map((s) => ({
            src: s.src || "",
            download: s.att.file_name,
            width: dimensions[s.att.id]?.width,
            height: dimensions[s.att.id]?.height,
        }));
    }, [slidesWithUrls, dimensions]);

    return {
        slides: finalSlides,
        isLoading: results.some((r) => r.isLoading),
        isError: results.some((r) => r.isError),
    };
}
