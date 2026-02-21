import clsx from "clsx";
import type { ElementType, HTMLAttributes } from "react";
import type { ComponentIntent, ComponentSize } from "@/lib/types/ui";
import styles from "./heading.module.css";

export type HeadingAlign = "left" | "center" | "right";

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
    as?: ElementType;
    size?: ComponentSize;
    intent?: ComponentIntent;
    align?: HeadingAlign;
    truncate?: boolean;
}

export function Heading({
    as: Component = "h2",
    size = "md",
    intent = "neutral",
    align,
    truncate,
    className,
    ...props
}: HeadingProps) {
    const classes = clsx(
        styles.heading,
        styles[size],
        styles[intent],
        align && styles[align],
        truncate && styles.truncate,
        className,
    );

    return <Component className={classes} {...props} />;
}
