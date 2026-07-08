import * as AvatarPrimitive from "@radix-ui/react-avatar";
import clsx from "clsx";
import { User } from "lucide-react";
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
            // Удаляем все спецсимволы (вкл. скобки), оставляем только буквы, цифры и пробелы
            const cleanName = fullName.replace(/[^\p{L}\p{N}\s]/gu, "");
            const rawParts = cleanName.trim().split(/\s+/);

            if (rawParts.length === 1 && rawParts[0] !== "") {
                return rawParts[0].substring(0, 2).toUpperCase();
            }
            if (rawParts.length >= 2) {
                return (
                    rawParts[0][0] + (rawParts[1]?.[0] || "")
                ).toUpperCase();
            }
            return <User className={styles.fallbackIcon} />;
        };

        const finalFallback =
            fallback ??
            (name ? (
                getInitials(name)
            ) : (
                <User className={styles.fallbackIcon} />
            ));

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
