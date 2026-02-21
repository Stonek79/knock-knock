import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import clsx from "clsx";
import { Check } from "lucide-react";
import React from "react";
import type { ComponentSize } from "@/lib/types/ui";
import styles from "./checkbox.module.css";

export type CheckboxSize = ComponentSize;

export interface CheckboxProps
    extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
    size?: CheckboxSize;
}

const sizeMapping: Record<CheckboxSize, string> = {
    xs: styles.xs,
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
    xl: styles.xl,
    xxl: styles.xxl,
};

export const Checkbox = React.forwardRef<
    React.ElementRef<typeof CheckboxPrimitive.Root>,
    CheckboxProps
>(({ className, size = "md", ...props }, ref) => (
    <CheckboxPrimitive.Root
        ref={ref}
        className={clsx(styles.root, sizeMapping[size], className)}
        {...props}
    >
        <CheckboxPrimitive.Indicator className={clsx(styles.indicator)}>
            <Check className={styles.icon} />
        </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;
