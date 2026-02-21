import type { HTMLAttributes } from "react";
import styles from "./spinner.module.css";

/**
 * Размеры спиннера — токены дизайн-системы.
 * Заменяют Radix-пропс `size`.
 */
export type SpinnerSize = "sm" | "md" | "lg";

/**
 * Пропсы кастомного компонента Spinner.
 */
export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
    /** Размер спиннера */
    size?: SpinnerSize;
}

/**
 * Кастомный компонент Spinner — нативный div с CSS-анимацией.
 * Заменяет Radix Spinner с его `size` пропсом.
 * Цвет управляется через `--accent-primary`.
 *
 * @example
 * <Spinner size="md" />
 * <Spinner size="lg" />
 */
export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
    const classes = [styles.spinner, styles[size], className]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            role="img"
            aria-label="Загрузка..."
            className={classes}
            {...props}
        />
    );
}
