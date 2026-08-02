import { useMemo } from "react";
import { ATTACHMENT_TYPES } from "@/lib/constants";
import type { Attachment, LightboxSlide } from "@/lib/types";
import { useLightboxDimensions } from "./useLightboxDimensions";
import { useLightboxOriginals } from "./useLightboxOriginals";
import { useLightboxThumbnails } from "./useLightboxThumbnails";

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
    const thumbnails = useLightboxThumbnails({ attachments, userId, enabled });

    const { urls, isLoading, isError } = useLightboxOriginals({
        attachments,
        userId,
        roomKey,
        enabled,
    });

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

    const dimensions = useLightboxDimensions(slidesWithUrls);

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
        isLoading,
        isError,
    };
}
