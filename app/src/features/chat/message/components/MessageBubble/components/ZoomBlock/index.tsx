import { Lightbox } from "yet-another-react-lightbox";
import DownloadPlugin from "yet-another-react-lightbox/plugins/download";
import VideoPlugin from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { useLightboxSlides } from "../../../../hooks/useLightboxSlides";
import "yet-another-react-lightbox/styles.css";
import { Forward, Star } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Attachment, RoomType } from "@/lib/types";

interface ZoomBlockProps {
    /** Список медиа-вложений (изображения и видео) */
    mediaAttachments: Attachment[];
    roomKey?: CryptoKey;
    roomType?: RoomType;
    userId: string;
    open: boolean;
    close: () => void;
    index: number;
    isDeleted: boolean;
}

/**
 * Компонент полноэкранного просмотра медиафайлов (картинок и видео) с зумом и скачиванием.
 */
export const ZoomBlock = ({
    mediaAttachments,
    userId,
    roomKey,
    isDeleted,
    open,
    close,
    index,
}: ZoomBlockProps) => {
    const { t } = useTranslation();

    const { slides } = useLightboxSlides({
        attachments: mediaAttachments,
        userId,
        roomKey,
        enabled: index >= 0,
    });

    // Мемоизируем конфигурации Lightbox, чтобы плагины не сбрасывали состояние
    // при каждом ререндере компонента из-за изменения ссылочной идентичности (Reference Identity)
    const lightboxPlugins = useMemo(
        () => [Zoom, DownloadPlugin, VideoPlugin],
        [],
    );

    const lightboxZoom = useMemo(
        () => ({
            maxZoomPixelRatio: 3, // Разрешаем глубокий зум (больше физического размера картинки)
            zoomInMultiplier: 2, // Мягкий шаг зума по кнопкам
            doubleTapDelay: 300,
            doubleClickDelay: 300,
        }),
        [],
    );

    const lightboxCarousel = useMemo(
        () => ({ finite: mediaAttachments.length === 1 }),
        [mediaAttachments.length],
    );

    const lightboxRender = useMemo(
        () => ({
            buttonPrev: mediaAttachments.length <= 1 ? () => null : undefined,
            buttonNext: mediaAttachments.length <= 1 ? () => null : undefined,
        }),
        [mediaAttachments.length],
    );

    const lightboxVideo = useMemo(
        () => ({
            controls: true,
            autoPlay: true,
            playsInline: true,
        }),
        [],
    );

    const starBtnTitle = t("chat.star", "В избранное");
    const forwardBtnTitle = t("chat.forward", "Переслать");

    const lightboxToolbar = useMemo(
        () => ({
            buttons: [
                <button
                    key="star"
                    type="button"
                    className="yarl__button"
                    onClick={() => {
                        // Кнопка в разработке
                    }}
                    title={starBtnTitle}
                >
                    <Star size={24} />
                </button>,
                <button
                    key="forward"
                    type="button"
                    className="yarl__button"
                    onClick={() => {
                        // Кнопка в разработке
                    }}
                    title={forwardBtnTitle}
                >
                    <Forward size={24} />
                </button>,
                "zoom",
                "download",
                "close",
            ],
        }),
        [starBtnTitle, forwardBtnTitle],
    );

    if (isDeleted || mediaAttachments.length <= 0) {
        return null;
    }

    return (
        <Lightbox
            open={open}
            close={close}
            index={Math.max(0, index)}
            slides={slides}
            plugins={lightboxPlugins}
            zoom={lightboxZoom}
            carousel={lightboxCarousel}
            render={lightboxRender}
            toolbar={lightboxToolbar}
            video={lightboxVideo}
        />
    );
};
