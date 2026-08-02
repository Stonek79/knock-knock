import { useEffect, useRef, useState } from "react";
import type { Attachment } from "@/lib/types";

interface SlideWithUrl {
    att: Attachment;
    src: string;
}

export function useLightboxDimensions(slidesWithUrls: SlideWithUrl[]) {
    const [dimensions, setDimensions] = useState<
        Record<string, { width: number; height: number }>
    >({});
    const loadingDimensionsRef = useRef<Set<string>>(new Set());

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

    useEffect(() => {
        return () => {
            loadingDimensionsRef.current.clear();
        };
    }, []);

    return dimensions;
}
