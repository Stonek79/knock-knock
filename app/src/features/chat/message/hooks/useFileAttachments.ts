import imageCompression from "browser-image-compression";
import { type ChangeEvent, useCallback, useState } from "react";
import type { useToast } from "@/components/ui/Toast";
import {
    COMPRESSION_OPTIONS,
    MEDIA_LIMITS,
    MIME_PREFIXES,
} from "@/lib/constants/storage";

interface UseFileAttachmentsProps {
    toast: ReturnType<typeof useToast>;
    t: (key: string, defaultValue: string) => string;
}

/**
 * Хук для управления вложениями (выбор, валидация по размеру, сжатие изображений, лимиты).
 */
export function useFileAttachments({ toast, t }: UseFileAttachmentsProps) {
    const [attachments, setAttachments] = useState<File[]>([]);
    const [attachmentCaption, setAttachmentCaption] = useState("");

    const handleFileChange = useCallback(
        async (e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                const selectedFiles = Array.from(e.target.files);

                const videoFiles = selectedFiles.filter((f) =>
                    f.type.startsWith(MIME_PREFIXES.VIDEO),
                );
                const imageFiles = selectedFiles.filter((f) =>
                    f.type.startsWith(MIME_PREFIXES.IMAGE),
                );
                const otherFiles = selectedFiles.filter(
                    (f) =>
                        !f.type.startsWith(MIME_PREFIXES.VIDEO) &&
                        !f.type.startsWith(MIME_PREFIXES.IMAGE),
                );

                // Проверка лимита в 30 МБ для видео
                const validVideoFiles = videoFiles.filter((f) => {
                    const limitBytes =
                        MEDIA_LIMITS.MAX_VIDEO_SIZE_MB * 1024 * 1024;
                    if (f.size > limitBytes) {
                        toast({
                            title: t(
                                "chat.videoTooLarge",
                                `Видео слишком большое (макс ${MEDIA_LIMITS.MAX_VIDEO_SIZE_MB} МБ). Рекомендуем сжать видео перед отправкой.`,
                            ),
                            variant: "error",
                        });
                        return false;
                    }
                    return true;
                });

                // Сжатие изображений
                const compressedImages = await Promise.all(
                    imageFiles.map(async (file) => {
                        try {
                            const options = {
                                maxSizeMB: COMPRESSION_OPTIONS.MAX_SIZE_MB,
                                maxWidthOrHeight:
                                    COMPRESSION_OPTIONS.MAX_WIDTH_OR_HEIGHT,
                                useWebWorker: true,
                            };
                            return await imageCompression(file, options);
                        } catch (error) {
                            console.error("Image compression error:", error);
                            return file; // fallback к оригиналу
                        }
                    }),
                );

                let finalFiles = [...attachments];

                if (validVideoFiles.length > 0) {
                    const existingVideoCount = attachments.filter((f) =>
                        f.type.startsWith(MIME_PREFIXES.VIDEO),
                    ).length;

                    if (existingVideoCount > 0 || validVideoFiles.length > 1) {
                        toast({
                            title: t(
                                "chat.onlyOneVideoAllowed",
                                "Можно прикрепить только одно видео.",
                            ),
                            variant: "error",
                        });
                    }

                    if (existingVideoCount === 0) {
                        finalFiles = [
                            ...finalFiles,
                            ...otherFiles,
                            ...compressedImages,
                            validVideoFiles[0],
                        ];
                    } else {
                        finalFiles = [
                            ...finalFiles,
                            ...otherFiles,
                            ...compressedImages,
                        ];
                    }
                } else {
                    finalFiles = [
                        ...finalFiles,
                        ...otherFiles,
                        ...compressedImages,
                    ];
                }

                if (finalFiles.length > MEDIA_LIMITS.MAX_ATTACHMENTS) {
                    toast({
                        title: t(
                            "chat.maxFilesReached",
                            `Можно прикрепить не более ${MEDIA_LIMITS.MAX_ATTACHMENTS} файлов.`,
                        ),
                        variant: "error",
                    });
                    finalFiles = finalFiles.slice(
                        0,
                        MEDIA_LIMITS.MAX_ATTACHMENTS,
                    );
                }

                setAttachments(finalFiles);
                e.target.value = "";
            }
        },
        [attachments, t, toast],
    );

    const removeAttachment = useCallback((index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const resetAttachments = useCallback(() => {
        setAttachments([]);
        setAttachmentCaption("");
    }, []);

    return {
        attachments,
        attachmentCaption,
        setAttachmentCaption,
        handleFileChange,
        removeAttachment,
        resetAttachments,
    };
}
