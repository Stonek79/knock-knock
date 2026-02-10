import { Slot } from "@radix-ui/react-slot";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import styles from "./button.module.css";

/**
 * Варианты стиля кнопки.
 */
type ButtonVariant = "solid" | "glass" | "ghost" | "outline" | "soft";

/**
 * Размеры кнопки.
 * Поддерживаются как семантические (sm/md/lg), так и Radix-совместимые (1-4).
 */
type ButtonSize = "sm" | "md" | "lg" | "icon" | "1" | "2" | "3" | "4";

/**
 * Пропсы компонента Button.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Если true, рендерит дочерний элемент вместо <button> */
    asChild?: boolean;
    /** Вариант стиля кнопки */
    variant?: ButtonVariant;
    /** Размер кнопки */
    size?: ButtonSize;
}

/**
 * Маппинг размеров в CSS-классы.
 */
const sizeClassMap: Record<ButtonSize, string> = {
    "1": styles.size1,
    "2": styles.size2,
    "3": styles.size3,
    "4": styles.size4,
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
    icon: styles.icon,
};

/**
 * Универсальный компонент кнопки.
 * Использует CSS-переменные из index.css для интеграции с дизайн-системой.
 *
 * @example
 * ```tsx
 * <Button variant="solid">Отправить</Button>
 * <Button variant="ghost" size="sm">Отмена</Button>
 * <Button variant="glass" size="3">Radix-размер</Button>
 * ```
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "solid",
            size = "md",
            asChild = false,
            ...props
        },
        ref,
    ) => {
        const Comp = asChild ? Slot : "button";

        // Собираем классы
        const buttonClasses = [
            styles.button,
            styles[variant],
            sizeClassMap[size],
            className,
        ]
            .filter(Boolean)
            .join(" ");

        return <Comp className={buttonClasses} ref={ref} {...props} />;
    },
);

Button.displayName = "Button";

export { Button };
