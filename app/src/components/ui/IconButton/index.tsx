import clsx from "clsx";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import type {
    ComponentIntent,
    ComponentShape,
    ComponentSize,
    ComponentVariant,
} from "@/lib/types/ui";
import styles from "./icon-button.module.css";

/**
 * Пропсы кастомного компонента IconButton.
 */
export interface IconButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Размер кнопки */
    size?: ComponentSize;
    /** Вариант стиля */
    variant?: ComponentVariant;
    /** Семантический цвет */
    intent?: ComponentIntent;
    /** Форма кнопки */
    shape?: ComponentShape;
}

/**
 * Кастомный компонент IconButton — нативная кнопка со стилями дизайн-системы.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    (
        {
            size = "md",
            variant = "ghost",
            intent = "neutral",
            shape = "round",
            className,
            type = "button",
            ...props
        },
        ref,
    ) => {
        const classes = clsx(
            styles.iconButton,
            styles[size],
            styles[variant],
            styles[intent],
            styles[shape],
            className,
        );

        return <button ref={ref} type={type} className={classes} {...props} />;
    },
);

IconButton.displayName = "IconButton";
