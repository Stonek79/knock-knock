import { useEffect, useState } from "react";
import { MEDIA_SYSTEM_CONSTANTS } from "@/lib/constants";
import { mediaService } from "@/lib/services/media";
import type { Attachment } from "@/lib/types";

interface UseLightboxThumbnailsProps {
    attachments: Attachment[];
    userId: string;
    enabled: boolean;
}

export function useLightboxThumbnails({
    attachments,
    userId,
    enabled,
}: UseLightboxThumbnailsProps) {
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

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

    return thumbnails;
}
