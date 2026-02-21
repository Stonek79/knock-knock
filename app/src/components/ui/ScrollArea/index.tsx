import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import clsx from "clsx";
import {
    type ComponentPropsWithoutRef,
    type ComponentRef,
    forwardRef,
} from "react";
import styles from "./scroll-area.module.css";

export interface ScrollAreaProps
    extends ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
    type?: "auto" | "always" | "scroll" | "hover";
    scrollbars?: "vertical" | "horizontal" | "both";
}

export const ScrollArea = forwardRef<
    ComponentRef<typeof ScrollAreaPrimitive.Root>,
    ScrollAreaProps
>(
    (
        {
            className,
            children,
            type = "hover",
            scrollbars = "vertical",
            ...props
        },
        ref,
    ) => (
        <ScrollAreaPrimitive.Root
            ref={ref}
            type={type}
            className={clsx(styles.root, className)}
            {...props}
        >
            <ScrollAreaPrimitive.Viewport className={styles.viewport}>
                {children}
            </ScrollAreaPrimitive.Viewport>

            {scrollbars !== "horizontal" && (
                <ScrollAreaPrimitive.Scrollbar
                    orientation="vertical"
                    className={clsx(styles.scrollbar, styles.vertical)}
                >
                    <ScrollAreaPrimitive.Thumb className={styles.thumb} />
                </ScrollAreaPrimitive.Scrollbar>
            )}

            {scrollbars !== "vertical" && (
                <ScrollAreaPrimitive.Scrollbar
                    orientation="horizontal"
                    className={clsx(styles.scrollbar, styles.horizontal)}
                >
                    <ScrollAreaPrimitive.Thumb className={styles.thumb} />
                </ScrollAreaPrimitive.Scrollbar>
            )}

            <ScrollAreaPrimitive.Corner className={styles.corner} />
        </ScrollAreaPrimitive.Root>
    ),
);

ScrollArea.displayName = "ScrollArea";
