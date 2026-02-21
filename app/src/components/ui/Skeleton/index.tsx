import clsx from "clsx";
import type { HTMLAttributes } from "react";
import styles from "./skeleton.module.css";

/**
 * Варианты формы скелетона.
 */
export type SkeletonShape = "rect" | "round" | "text";

/**
 * Пропсы базового компонента Skeleton.
 */
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    /** Форма скелетона */
    shape?: SkeletonShape;
}

export function Skeleton({
    shape = "rect",
    className,
    ...props
}: SkeletonProps) {
    const shapeClass =
        shape === "round"
            ? styles.round
            : shape === "text"
              ? styles.text
              : undefined;

    const classes = clsx(styles.skeleton, shapeClass, className);

    return <div className={classes} aria-hidden="true" {...props} />;
}

/* =========================================== */
/* Составные скелетоны для типовых сценариев */
/* =========================================== */

/**
 * Скелетон элемента списка (чат, контакт, звонок).
 * Аватар + две строки текста + метка времени.
 */
export function ListItemSkeleton() {
    return (
        <div className={styles.listItem} aria-hidden="true">
            {/* Аватар */}
            <Skeleton className={styles.listItemAvatar} />

            {/* Текстовый блок */}
            <div className={styles.listItemContent}>
                <div className={styles.listItemRow}>
                    <Skeleton className={styles.listItemTitle} />
                    <Skeleton className={styles.listItemTime} />
                </div>
                <Skeleton className={styles.listItemSubtitle} />
            </div>
        </div>
    );
}

/**
 * Группа скелетонов элементов списка.
 *
 * @example
 * <ListLoadingState count={6} />
 */
export function ListLoadingState({ count = 8 }: { count?: number }) {
    return (
        <output aria-busy="true">
            {Array.from({ length: count }, (_, i) => (
                <ListItemSkeleton
                    key={`list-skeleton-item-${count}-${i + 1}`}
                />
            ))}
        </output>
    );
}

/**
 * Скелетон основного лейаута приложения (сайдбар + контент).
 * Используется во время проверки сессии.
 */
export function MainLayoutSkeleton({ appName }: { appName?: string }) {
    return (
        <div className={styles.mainLayout}>
            {/* Sidebar */}
            <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    {appName ? (
                        <span className={styles.sidebarHeaderContent}>
                            {appName}
                        </span>
                    ) : (
                        <Skeleton className={styles.sidebarHeaderSkeleton} />
                    )}
                </div>
                <ListLoadingState count={8} />
            </div>

            {/* Content */}
            <div className={styles.mainContent}>
                <Skeleton className={styles.mainContentTitleSkeleton} />
                <div className={styles.contentBlock}>
                    <Skeleton className={styles.mainContentBodySkeleton} />
                </div>
            </div>
        </div>
    );
}
