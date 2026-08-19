import { Slot } from "@radix-ui/react-slot";
import clsx from "clsx";
import { type ButtonHTMLAttributes, forwardRef, type JSX } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import type {
    ComponentIntent,
    ComponentShape,
    ComponentSize,
    ComponentVariant,
} from "@/lib/types/ui";
import styles from "./icon-button.module.css";

/**
 * Размеры иконок меньше токена `--size-touch`, для которых hit-area расширяется
 * до комфортного сенсорного размера невидимым `::before`.
 */
const HIT_AREA_SIZES: ReadonlySet<ComponentSize> = new Set(["xs", "sm", "md"]);

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
    /** Использовать дочерний элемент как корневой (например, Link от роутера) */
    asChild?: boolean;
    /** Текст всплывающей подсказки (опционально) */
    tooltip?: string;
}

/**
 * Универсальный IconButton.
 * Поддерживает:
 * 1. asChild — для использования с Link или другими компонентами.
 * 2. tooltip — для встроенной подсказки при наведении.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    (
        {
            size = "md",
            variant = "ghost",
            intent = "neutral",
            shape = "round",
            asChild = false,
            tooltip,
            className,
            type = "button",
            children,
            ...props
        },
        ref,
    ): JSX.Element => {
        // Если asChild=true, используем Slot, иначе нативный button
        const Comp = asChild ? Slot : "button";

        // Базовый элемент кнопки
        const buttonElement = (
            <Comp
                ref={ref}
                // Для полиморфного компонента (Slot) атрибут type может быть вреден
                type={asChild ? undefined : type}
                // Единый механизм расширения hit-area: атрибут для JSX-теста и
                // опт-аут через data-hit-area="none" в плотных раскладках.
                data-hit-area={HIT_AREA_SIZES.has(size) ? size : undefined}
                className={clsx(
                    styles.iconButton,
                    styles[size],
                    styles[variant],
                    styles[intent],
                    styles[shape],
                    className,
                )}
                {...props}
            >
                {children}
            </Comp>
        );

        // Если тултип передан — оборачиваем, если нет — возвращаем как есть
        if (tooltip) {
            return <Tooltip content={tooltip}>{buttonElement}</Tooltip>;
        }

        return buttonElement;
    },
);

IconButton.displayName = "IconButton";
