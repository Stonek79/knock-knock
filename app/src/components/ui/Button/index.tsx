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

        return <Comp className={buttonClasses} ref={ref} {...props} />;
    },
);

Button.displayName = "Button";

export { Button };
