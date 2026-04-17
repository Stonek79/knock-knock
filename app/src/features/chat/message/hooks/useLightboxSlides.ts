import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { QUERY_KEYS } from "@/lib/constants";
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
    const results = useQueries({
        queries: attachments.map((att) => ({
            queryKey: QUERY_KEYS.media(att.id as RecordIdString, userId),
            queryFn: async () => {
                const result = await mediaService.ensureMedia({
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
     * Формируем массив слайдов с Blob URL.
     */
    const slides = useMemo(() => {
        return results.map((res, index) => {
            const att = attachments[index];
            const blob = res.data?.original;

            return {
                src: blob ? URL.createObjectURL(blob) : "",
                download: att.file_name,
                id: att.id,
            };
        });
    }, [results, attachments]);

    /**
     * Очистка Blob URL при изменении слайдов или размонтировании.
     */
    useEffect(() => {
        return () => {
            for (const slide of slides) {
                if (slide.src.startsWith("blob:")) {
                    URL.revokeObjectURL(slide.src);
                }
            }
        };
    }, [slides]);

    return {
        slides: slides.map((s) => ({ src: s.src, download: s.download })),
        isLoading: results.some((r) => r.isLoading),
        isError: results.some((r) => r.isError),
    };
}
