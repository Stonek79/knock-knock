import clsx from "clsx";
import { ImageOff } from "lucide-react";
import {
    type Dispatch,
    type MouseEvent,
    type SetStateAction,
    useEffect,
} from "react";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Image } from "@/components/ui/Image";
import { ICON_SIZE, MEDIA_SYSTEM_CONSTANTS } from "@/lib/constants";
import { useMedia } from "@/lib/mediadb/useMedia";
import type { Attachment } from "@/lib/types";
import { useSystemMedia } from "../../../../hooks/useSystemMedia";
import styles from "./attachment-renderer.module.css";
import { getRatioClass } from "./helpers";

interface CachedImageProps {
    att: Attachment;
    index: number;
    setLightboxIndex: Dispatch<SetStateAction<number>>;
    imageErrors: Record<string, boolean>;
    setImageErrors: Dispatch<SetStateAction<Record<string, boolean>>>;
    roomKey?: CryptoKey;
    isVault?: boolean;
    userId: string;
    onErrorStateChange?: (id: string, hasError: boolean) => void;
    isSingle: boolean;
    isSystem?: boolean;
}

export function CachedImage({
    att,
    index,
    setLightboxIndex,
    imageErrors,
    setImageErrors,
    roomKey,
    isVault,
    userId,
    onErrorStateChange,
    isSingle,
    isSystem,
}: CachedImageProps) {
    const { objectUrl, thumbnailUrl, isLoading, error, metadata } = useMedia({
        mediaId: isSystem ? undefined : att.id,
        roomKey,
        isVault,
        userId,
        initialUrl: att.url,
    });
    const systemMedia = useSystemMedia(
        Boolean(isSystem),
        att.id,
        att.file_name,
    );
    const effectiveObjectUrl = isSystem ? systemMedia.objectUrl : objectUrl;
    const effectiveLoading = isSystem ? systemMedia.isLoading : isLoading;
    const effectiveError = isSystem ? systemMedia.error : error;

    useEffect(() => {
        onErrorStateChange?.(att.id, !!effectiveError);
    }, [att.id, effectiveError, onErrorStateChange]);

    const isBlob =
        typeof att.url === "string" &&
        att.url.startsWith(MEDIA_SYSTEM_CONSTANTS.BLOB_PREFIX);
    const displayUrl = isBlob ? att.url : effectiveObjectUrl || thumbnailUrl;

    const showPlaceholder =
        !displayUrl &&
        (imageErrors[att.id] || !!effectiveError || effectiveLoading);

    const ratioClass = getRatioClass(isSingle, metadata);

    const handleButtonClick = (e: MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        if (!showPlaceholder) {
            setLightboxIndex(index);
        }
    };

    const handleImageError = () => {
        setImageErrors((prev) => ({
            ...prev,
            [att.id]: true,
        }));
    };

    return (
        <Button
            asChild
            variant="ghost"
            key={att.id}
            type="button"
            className={clsx(styles.imageButton, ratioClass)}
            onClick={handleButtonClick}
        >
            <button type="button">
                {showPlaceholder ? (
                    <Flex
                        align="center"
                        justify="center"
                        className={clsx(styles.imagePlaceholder, ratioClass)}
                    >
                        <ImageOff
                            size={ICON_SIZE.lg}
                            className={styles.placeholderIcon}
                        />
                    </Flex>
                ) : (
                    <Image
                        src={displayUrl}
                        alt={att.file_name}
                        className={styles.attachmentImage}
                        loading="lazy"
                        onError={handleImageError}
                    />
                )}
            </button>
        </Button>
    );
}
