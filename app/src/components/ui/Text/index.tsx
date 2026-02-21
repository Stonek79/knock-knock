import clsx from "clsx";
import type { ElementType, HTMLAttributes } from "react";
import type { ComponentIntent, ComponentSize } from "@/lib/types/ui";
import styles from "./text.module.css";

export type TextWeight = "normal" | "medium" | "semibold" | "bold";
export type TextAlign = "left" | "center" | "right";

export interface TextProps extends HTMLAttributes<HTMLElement> {
    as?: ElementType;
    intent?: ComponentIntent;
    size?: ComponentSize;
    weight?: TextWeight;
    align?: TextAlign;
    truncate?: boolean;
}

export function Text({
    as: Component = "span",
    intent = "neutral",
    size,
    weight,
    align,
    truncate,
    className,
    ...props
}: TextProps) {
    const classes = clsx(
        styles.text,
        styles[intent],
        size && styles[size],
        weight && styles[weight],
        align && styles[align],
        truncate && styles.truncate,
        className,
    );

    return <Component className={classes} {...props} />;
}
