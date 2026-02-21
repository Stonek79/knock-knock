import clsx from "clsx";
import type { HTMLAttributes } from "react";
import styles from "./card.module.css";

export type CardVariant = "glass" | "surface" | "ghost" | "classic";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
}

export function Card({ variant = "surface", className, ...props }: CardProps) {
    const classes = clsx(styles.card, styles[variant], className);

    return <div className={classes} {...props} />;
}
