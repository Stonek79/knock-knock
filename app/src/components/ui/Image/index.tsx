import clsx from "clsx";
import { forwardRef, type ImgHTMLAttributes, useState } from "react";
import styles from "./image.module.css";

export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
    onImageError?: () => void;
}

export const Image = forwardRef<HTMLImageElement, ImageProps>(
    (
        { className, src, alt, fallbackSrc, onImageError, onError, ...props },
        ref,
    ) => {
        const [hasError, setHasError] = useState(false);

        const handleError = (
            e: React.SyntheticEvent<HTMLImageElement, Event>,
        ) => {
            if (!hasError) {
                setHasError(true);
                onImageError?.();
            }
            onError?.(e);
        };

        const displaySrc = hasError && fallbackSrc ? fallbackSrc : src;

        return (
            <img
                ref={ref}
                src={displaySrc}
                alt={alt}
                className={clsx(styles.image, className)}
                onError={handleError}
                {...props}
            />
        );
    },
);

Image.displayName = "Image";
