import styles from "./attachment-renderer.module.css";

export function getRatioClass(
    isSingle: boolean,
    metadata?: { width?: number; height?: number } | null,
): string {
    if (!isSingle || !metadata?.width || !metadata?.height) {
        return "";
    }

    const ratio = metadata.width / metadata.height;

    switch (true) {
        case ratio <= 0.6:
            return styles.ratio_1_2;
        case ratio <= 0.7:
            return styles.ratio_2_3;
        case ratio <= 0.85:
            return styles.ratio_3_4;
        case ratio <= 1.15:
            return styles.ratio_1_1;
        case ratio <= 1.4:
            return styles.ratio_4_3;
        case ratio <= 1.6:
            return styles.ratio_3_2;
        case ratio <= 1.85:
            return styles.ratio_16_9;
        default:
            return styles.ratio_2_1;
    }
}
