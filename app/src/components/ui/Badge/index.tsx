import type { HTMLAttributes } from "react";
import type { ComponentIntent, ComponentVariant } from "@/lib/types/ui";
import styles from "./badge.module.css";

/**
 * Пропсы кастомного компонента Badge.
 */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    /** Вариант стиля (заполнение) */
    variant?: ComponentVariant;
    /** Семантическое намерение (цвет) */
    intent?: ComponentIntent;
}

/**
 * Кастомный компонент Badge — нативный span со стилями дизайн-системы.
 *
 * @example
 * <Badge intent="danger" variant="soft">Ошибка</Badge>
 * <Badge intent="success" variant="outline">Онлайн</Badge>
 * <Badge intent="neutral">Черновик</Badge>
 */
export function Badge({
    variant = "surface",
    intent = "neutral",
    className,
    ...props
}: BadgeProps) {
    const classes = [styles.badge, styles[variant], styles[intent], className]
        .filter(Boolean)
        .join(" ");

    return <span className={classes} {...props} />;
}
