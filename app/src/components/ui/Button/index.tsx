import { Slot } from "@radix-ui/react-slot";
import clsx from "clsx";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import type {
    ComponentIntent,
    ComponentSize,
    ComponentVariant,
} from "@/lib/types/ui";
import styles from "./button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    variant?: ComponentVariant;
    size?: ComponentSize | "icon";
    intent?: ComponentIntent;
}

/**
 * Размеры кнопок меньше токена `--size-touch`, для которых hit-area расширяется
 * до комфортного сенсорного размера невидимым `::before`. Применяем только к
 * квадратной icon-кнопке: у текстовых кнопок (xs/sm/md) расширение высоты через
 * `::before` перекрывало бы соседние интерактивные контролы (например, слайдер
 * прогресса у аудио-плеера) в плотных stacked-раскладках.
 */
const HIT_AREA_SIZES: ReadonlySet<ComponentSize | "icon"> = new Set(["icon"]);

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "solid",
            size = "md",
            intent = "primary",
            asChild = false,
            ...props
        },
        ref,
    ) => {
        const Comp = asChild ? Slot : "button";

        const buttonClasses = clsx(
            styles.button,
            styles[variant],
            styles[intent],
            styles[size],
            className,
        );

        return (
            <Comp
                className={buttonClasses}
                ref={ref}
                data-hit-area={HIT_AREA_SIZES.has(size) ? size : undefined}
                {...props}
            />
        );
    },
);

Button.displayName = "Button";

export { Button };
