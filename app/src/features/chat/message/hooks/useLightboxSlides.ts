import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ATTACHMENT_TYPES,
    MEDIA_SYSTEM_CONSTANTS,
    OPTIMISTIC_ID_PREFIX,
    QUERY_KEYS,
} from "@/lib/constants";
import { mediaService } from "@/lib/services/media";
import type { Attachment, LightboxSlide, RecordIdString } from "@/lib/types";

interface UseLightboxSlidesProps {
    /** Список вложений (изображений/видео) */
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
    const createdUrlsRef = useRef<Set<string>>(new Set());
    const [urls, setUrls] = useState<Record<string, string>>({});
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

    // Загрузка расшифрованных превью из IndexedDB при открытии лайтбокса
    useEffect(() => {
        if (!enabled) {
            return;
        }

        let isCancelled = false;
        const localCreatedUrls: string[] = [];

        const loadThumbnails = async () => {
            const thumbs: Record<string, string> = {};
            for (const att of attachments) {
                const isBlob =
                    typeof att.url === "string" &&
                    att.url.startsWith(MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX);
                if (isBlob) {
                    continue;
                }

                const cached = await mediaService.getMedia({
                    id: att.id,
                    userId,
                });
                if (cached.isOk() && cached.value.thumbnail) {
                    if (isCancelled) {
                        return;
                    }
                    const objUrl = URL.createObjectURL(cached.value.thumbnail);
                    thumbs[att.id] = objUrl;
                    localCreatedUrls.push(objUrl);
                }
            }

            if (!isCancelled) {
                setThumbnails(thumbs);
            }
        };

        loadThumbnails();

        return () => {
            isCancelled = true;
            for (const url of localCreatedUrls) {
                URL.revokeObjectURL(url);
            }
            setThumbnails({});
        };
    }, [attachments, userId, enabled]);

    const results = useQueries({
        queries: attachments.map((att) => {
            const isOptimistic =
                att.id.startsWith(OPTIMISTIC_ID_PREFIX) ||
                (typeof att.url === "string" &&
                    att.url.startsWith(MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX));

            return {
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
                // Загружаем оригиналы только когда лайтбокс открыт и это не временный blob
                enabled: enabled && !!att.id && !!userId && !isOptimistic,
                staleTime: 5 * 60 * 1000,
                gcTime: 10 * 60 * 1000,
            };
        }),
    });

    /**
     * Создаем Blob URL-ы для оригиналов.
     */
    useEffect(() => {
        let hasNew = false;
        const newUrls: Record<string, string> = {};

        attachments.forEach((att, index) => {
            const res = results[index];
            const blob = res.data?.original;
            const isBlob =
                typeof att.url === "string" &&
                att.url.startsWith(MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX);

            if (isBlob) {
                if (!urlsRef.current[att.id]) {
                    urlsRef.current[att.id] = att.url;
                    newUrls[att.id] = att.url;
                    hasNew = true;
                }
            } else if (blob) {
                if (!urlsRef.current[att.id]) {
                    const objUrl = URL.createObjectURL(blob);
                    urlsRef.current[att.id] = objUrl;
                    createdUrlsRef.current.add(objUrl);
                    newUrls[att.id] = objUrl;
                    hasNew = true;
                }
            }
        });

        if (hasNew) {
            setUrls((prev) => {
                return { ...prev, ...newUrls };
            });
        }
    }, [results, attachments]);

    /**
     * Формируем промежуточный массив с URL-ами.
     */
    const slidesWithUrls = useMemo(() => {
        return attachments.map((att) => {
            return {
                att,
                src: urls[att.id] || "",
            };
        });
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
                    setDimensions((prev) => {
                        return {
                            ...prev,
                            [att.id]: {
                                width: img.naturalWidth,
                                height: img.naturalHeight,
                            },
                        };
                    });
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
        return () => {
            const created = createdUrlsRef.current;
            for (const url of created) {
                URL.revokeObjectURL(url);
            }

            urlsRef.current = {};
            createdUrlsRef.current.clear();
            loadingDimensionsRef.current.clear();
        };
    }, []);

    const finalSlides: LightboxSlide[] = useMemo(() => {
        return slidesWithUrls.map((s) => {
            if (s.att.type === ATTACHMENT_TYPES.VIDEO) {
                return {
                    type: ATTACHMENT_TYPES.VIDEO,
                    sources: s.src
                        ? [
                              {
                                  src: s.src,
                                  type: s.att.content_type || "video/mp4",
                              },
                          ]
                        : [],
                    poster: thumbnails[s.att.id] || undefined,
                };
            }

            return {
                type: ATTACHMENT_TYPES.IMAGE,
                src: s.src || thumbnails[s.att.id] || "",
                download: s.att.file_name,
                width: dimensions[s.att.id]?.width,
                height: dimensions[s.att.id]?.height,
            };
        });
    }, [slidesWithUrls, dimensions, thumbnails]);

    return {
        slides: finalSlides,
        isLoading: results.some((r) => {
            return r.isLoading;
        }),
        isError: results.some((r) => {
            return r.isError;
        }),
    };
}
