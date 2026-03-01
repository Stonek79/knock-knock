import * as SliderPrimitive from "@radix-ui/react-slider";
import clsx from "clsx";
import { type ComponentProps, type ComponentRef, forwardRef } from "react";
import styles from "./Slider.module.css";

interface SliderProps extends ComponentProps<typeof SliderPrimitive.Root> {
    className?: string;
}

/**
 * Компонент ползунка (слайдера) для управления значениями.
 */
export const Slider = forwardRef<
    ComponentRef<typeof SliderPrimitive.Root>,
    SliderProps
>(({ className, ...props }, ref) => {
    return (
        <SliderPrimitive.Root
            ref={ref}
            className={clsx(styles.root, className)}
            {...props}
        >
            <SliderPrimitive.Track className={styles.track}>
                <SliderPrimitive.Range className={styles.range} />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className={styles.thumb} />
        </SliderPrimitive.Root>
    );
});

Slider.displayName = "Slider";
