import clsx from "clsx";
import {
    forwardRef,
    type HTMLAttributes,
    type InputHTMLAttributes,
} from "react";
import type { ComponentSize } from "@/lib/types/ui";
import styles from "./text-field.module.css";

export interface TextFieldProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
    size?: ComponentSize;
}

const TextFieldRoot = forwardRef<HTMLDivElement, TextFieldProps>(
    ({ size = "md", className, children, ...props }, ref) => {
        const classes = clsx(styles.textFieldWrapper, styles[size], className);

        return (
            <div ref={ref} className={classes}>
                <input className={styles.textFieldInput} {...props} />
                {children}
            </div>
        );
    },
);

TextFieldRoot.displayName = "TextField";

interface TextFieldSlotProps extends HTMLAttributes<HTMLDivElement> {}

const TextFieldSlot = forwardRef<HTMLDivElement, TextFieldSlotProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={clsx(styles.textFieldSlot, className)}
                {...props}
            />
        );
    },
);

TextFieldSlot.displayName = "TextField.Slot";

export const TextField = Object.assign(TextFieldRoot, {
    Slot: TextFieldSlot,
});
