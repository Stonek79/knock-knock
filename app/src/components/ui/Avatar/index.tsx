import * as AvatarPrimitive from "@radix-ui/react-avatar";
import clsx from "clsx";
import { type ComponentRef, forwardRef, type ReactNode } from "react";
import type { ComponentSize } from "@/lib/types/ui";
import styles from "./avatar.module.css";

/**
 * Размеры аватара.
 */
export type AvatarSize = ComponentSize;

/**
 * Маппинг размеров аватара в CSS-классы.
 */
const sizeMapping: Record<AvatarSize, string> = {
    xs: styles.xs,
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
    xl: styles.xl,
    xxl: styles.xxl,
};

/**
 * Пропсы кастомного компонента Avatar.
 */
export interface AvatarProps
    extends Omit<
        React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
        "children"
    > {
    /** URL изображения */
    src?: string;
    /** Имя пользователя для fallback (инициалы) */
    name?: string;
    /** Явный fallback (если name не передан) */
    fallback?: ReactNode;
    /** Размер аватара */
    size?: AvatarSize;
    /** Радиус скругления */
    radius?: "full" | "large" | "medium" | "small" | "none";
}

const radiusMapping: Record<string, string> = {
    full: styles["radius-full"],
    large: styles["radius-large"],
    medium: styles["radius-medium"],
    small: styles["radius-small"],
    none: styles["radius-none"],
};

/**
 * Кастомный компонент Avatar на базе @radix-ui/react-avatar.
 * Поддерживает наши размеры (xs-xxl) и автоматическую генерацию инициалов.
 */
export const Avatar = forwardRef<
    ComponentRef<typeof AvatarPrimitive.Root>,
    AvatarProps
>(
    (
        {
            src,
            name,
            fallback,
            size = "md",
            radius = "full",
            className,
            style,
            ...props
        },
        ref,
    ) => {
        // Генерируем инициалы
        const getInitials = (fullName: string) => {
            const rawParts = fullName.trim().split(/\s+/);

            // Фильтруем части имени: игнорируем слова с точками (префиксы),
            // но только если после фильтрации останется хотя бы одно слово.
            const parts = rawParts.filter((word) => !word.includes("."));
            const finalParts = parts.length > 0 ? parts : rawParts;

            if (finalParts.length === 1) {
                return finalParts[0].substring(0, 2).toUpperCase();
            }
            if (finalParts.length >= 2) {
                return (
                    finalParts[0][0] + (finalParts[1]?.[0] || "")
                ).toUpperCase();
            }
            return "?";
        };

        const finalFallback = fallback ?? (name ? getInitials(name) : "?");

        return (
            <AvatarPrimitive.Root
                ref={ref}
                className={clsx(
                    styles.avatar,
                    sizeMapping[size],
                    radiusMapping[radius],
                    className,
                )}
                style={style}
                {...props}
            >
                {src && (
                    <AvatarPrimitive.Image
                        src={src}
                        alt={name || "Avatar"}
                        className={styles.image}
                    />
                )}
                <AvatarPrimitive.Fallback
                    className={styles.fallback}
                    delayMs={src ? 600 : 0}
                >
                    {finalFallback}
                </AvatarPrimitive.Fallback>
            </AvatarPrimitive.Root>
        );
    },
);

Avatar.displayName = "Avatar";
