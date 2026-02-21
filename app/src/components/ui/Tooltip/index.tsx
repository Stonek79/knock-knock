import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import clsx from "clsx";
import {
    type ComponentPropsWithoutRef,
    type ComponentRef,
    forwardRef,
    type ReactNode,
} from "react";
import styles from "./tooltip.module.css";

export const Provider = TooltipPrimitive.Provider;
export const Root = TooltipPrimitive.Root;
export const Trigger = TooltipPrimitive.Trigger;
export const Portal = TooltipPrimitive.Portal;

export interface TooltipProps
    extends Omit<
        ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
        "content"
    > {
    content: ReactNode;
    children: ReactNode;
}

export const Tooltip = forwardRef<
    ComponentRef<typeof TooltipPrimitive.Content>,
    TooltipProps
>(({ className, sideOffset = 4, content, children, ...props }, ref) => (
    <TooltipPrimitive.Provider delayDuration={200}>
        <TooltipPrimitive.Root>
            <TooltipPrimitive.Trigger asChild>
                {children}
            </TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    ref={ref}
                    sideOffset={sideOffset}
                    className={clsx(styles.content, className)}
                    {...props}
                >
                    {content}
                    <TooltipPrimitive.Arrow className={styles.arrow} />
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
));
Tooltip.displayName = "Tooltip";
