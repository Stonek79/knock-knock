import { useEffect, useState } from "react";
import { mediaRepository } from "@/lib/repositories/media.repository";

interface SystemMediaState {
    objectUrl?: string;
    isLoading: boolean;
    error: Error | null;
}

/** Загружает server-owned broadcast media с bearer-заголовком и освобождает Blob URL. */
export function useSystemMedia(
    enabled: boolean,
    mediaId: string,
    filename: string,
): SystemMediaState {
    const [state, setState] = useState<SystemMediaState>({
        isLoading: enabled,
        error: null,
    });

    useEffect(() => {
        if (!enabled) {
            setState({ isLoading: false, error: null });
            return;
        }

        let disposed = false;
        let objectUrl: string | undefined;
        setState({ isLoading: true, error: null });

        void mediaRepository
            .downloadSystemFile(mediaId, filename)
            .then((result) => {
                if (disposed) {
                    return;
                }
                if (result.isErr()) {
                    setState({ isLoading: false, error: result.error });
                    return;
                }
                objectUrl = URL.createObjectURL(result.value);
                setState({ isLoading: false, error: null, objectUrl });
            });

        return () => {
            disposed = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [enabled, mediaId, filename]);

    return state;
}
