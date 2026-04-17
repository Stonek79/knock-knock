import { type ChangeEvent, useCallback, useState } from "react";
import type { useToast } from "@/components/ui/Toast";
import { MEDIA_LIMITS, MIME_PREFIXES } from "@/lib/constants/storage";

interface UseFileAttachmentsProps {
    toast: ReturnType<typeof useToast>;
    t: (key: string, defaultValue: string) => string;
}

/**
 * Хук для управления вложениями (выбор, валидация по размеру, лимиты).
 * Логика сжатия и шифрования вынесена в MediaService.
 */
export function useFileAttachments({ toast, t }: UseFileAttachmentsProps) {
    const [attachments, setAttachments] = useState<File[]>([]);
    const [attachmentCaption, setAttachmentCaption] = useState("");

    const handleFileChange = useCallback(
        async (e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                const selectedFiles = Array.from(e.target.files);

                // 1. Проверка общего лимита количества
                const totalTarget = attachments.length + selectedFiles.length;
                if (totalTarget > MEDIA_LIMITS.MAX_ATTACHMENTS) {
                    toast({
                        title: t(
                            "chat.maxFilesReached",
                            `Можно прикрепить не более ${MEDIA_LIMITS.MAX_ATTACHMENTS} файлов.`,
                        ),
                        variant: "error",
                    });
                    return;
                }

                // 2. Валидация типов и размеров (поверхностная, основная будет в сервисе)
                const validFiles = selectedFiles.filter((file) => {
                    const sizeMB = file.size / 1024 / 1024;

                    if (file.type.startsWith(MIME_PREFIXES.VIDEO)) {
                        if (sizeMB > MEDIA_LIMITS.MAX_VIDEO_SIZE_MB) {
                            toast({
                                title: t(
                                    "chat.videoTooLarge",
                                    `Видео ${file.name} слишком большое.`,
                                ),
                                variant: "error",
                            });
                            return false;
                        }

                        // Ограничение: одно видео на сообщение (бизнес-логика проекта)
                        const hasVideo = attachments.some((a) =>
                            a.type.startsWith(MIME_PREFIXES.VIDEO),
                        );
                        if (hasVideo) {
                            toast({
                                title: t(
                                    "chat.onlyOneVideoAllowed",
                                    "Только одно видео",
                                ),
                                variant: "error",
                            });
                            return false;
                        }
                    }

                    if (file.type.startsWith(MIME_PREFIXES.IMAGE)) {
                        if (sizeMB > MEDIA_LIMITS.MAX_IMAGE_SIZE_MB) {
                            toast({
                                title: t(
                                    "chat.imageTooLarge",
                                    `Фото ${file.name} слишком большое`,
                                ),
                                variant: "error",
                            });
                            return false;
                        }
                    }

                    return true;
                });

                if (validFiles.length > 0) {
                    setAttachments((prev) => [...prev, ...validFiles]);
                }

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
