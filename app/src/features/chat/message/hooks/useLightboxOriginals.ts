import { useQueries } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
    MEDIA_SYSTEM_CONSTANTS,
    OPTIMISTIC_ID_PREFIX,
    QUERY_KEYS,
} from "@/lib/constants";
import { mediaService } from "@/lib/services/media";
import type { Attachment } from "@/lib/types";

interface UseLightboxOriginalsProps {
    attachments: Attachment[];
    userId: string;
    roomKey?: CryptoKey;
    enabled: boolean;
}

export function useLightboxOriginals({
    attachments,
    userId,
    roomKey,
    enabled,
}: UseLightboxOriginalsProps) {
    const urlsRef = useRef<Record<string, string>>({});
    const createdUrlsRef = useRef<Set<string>>(new Set());
    const [urls, setUrls] = useState<Record<string, string>>({});

    const results = useQueries({
        queries: attachments.map((att) => {
            const isOptimistic =
                att.id.startsWith(OPTIMISTIC_ID_PREFIX) ||
                (typeof att.url === "string" &&
                    att.url.startsWith(MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX));

            return {
                queryKey: QUERY_KEYS.media(att.id, userId),
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
                enabled: enabled && !!att.id && !!userId && !isOptimistic,
                staleTime: 5 * 60 * 1000,
                gcTime: 10 * 60 * 1000,
            };
        }),
    });

    useEffect(() => {
        let hasNew = false;
        const newUrls: Record<string, string> = {};

        attachments.forEach((att, index) => {
            const res = results[index];
            const blob = res?.data?.original;
            const isBlob =
                typeof att.url === "string" &&
                att.url.startsWith(MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX);

            if (isBlob) {
                if (!urlsRef.current[att.id]) {
                    urlsRef.current[att.id] = att.url as string;
                    newUrls[att.id] = att.url as string;
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

    useEffect(() => {
        return () => {
            const created = createdUrlsRef.current;
            for (const url of created) {
                URL.revokeObjectURL(url);
            }

            urlsRef.current = {};
            createdUrlsRef.current.clear();
        };
    }, []);

    const isLoading = results.some((r) => r.isLoading);
    const isError = results.some((r) => r.isError);

    return { urls, isLoading, isError };
}
