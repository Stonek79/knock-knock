import clsx from "clsx";
import { forwardRef, type TextareaHTMLAttributes } from "react";
import type { ComponentSize } from "@/lib/types/ui";
import styles from "./textarea.module.css";

export interface TextAreaProps
    extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
    size?: ComponentSize;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    ({ size = "md", className, ...props }, ref) => {
        const classes = clsx(styles.textArea, styles[size], className);

        return <textarea ref={ref} className={classes} {...props} />;
    },
);

TextArea.displayName = "TextArea";
