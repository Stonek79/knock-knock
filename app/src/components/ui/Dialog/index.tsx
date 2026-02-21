import * as DialogPrimitive from "@radix-ui/react-dialog";
import clsx from "clsx";
import { X } from "lucide-react";
import {
    type ComponentPropsWithoutRef,
    type ComponentRef,
    forwardRef,
} from "react";
import { IconButton } from "../IconButton";
import styles from "./dialog.module.css";

export const Root = DialogPrimitive.Root;
export const Trigger = DialogPrimitive.Trigger;
export const Portal = DialogPrimitive.Portal;

export const Overlay = forwardRef<
    ComponentRef<typeof DialogPrimitive.Overlay>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={clsx(styles.overlay, className)}
        {...props}
    />
));
Overlay.displayName = DialogPrimitive.Overlay.displayName;

export const Content = forwardRef<
    ComponentRef<typeof DialogPrimitive.Content>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
        hideCloseButton?: boolean;
    }
>(({ className, children, hideCloseButton, ...props }, ref) => (
    <Portal>
        <Overlay />
        <DialogPrimitive.Content
            ref={ref}
            className={clsx(styles.content, className)}
            {...props}
        >
            {children}
            {!hideCloseButton && (
                <DialogPrimitive.Close asChild>
                    <IconButton
                        aria-label="Close"
                        variant="ghost"
                        intent="neutral"
                        size="md"
                        className={styles.closeButton}
                    >
                        <X />
                    </IconButton>
                </DialogPrimitive.Close>
            )}
        </DialogPrimitive.Content>
    </Portal>
));
Content.displayName = DialogPrimitive.Content.displayName;

export const Title = forwardRef<
    ComponentRef<typeof DialogPrimitive.Title>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={clsx(styles.title, className)}
        {...props}
    />
));
Title.displayName = DialogPrimitive.Title.displayName;

export const Description = forwardRef<
    ComponentRef<typeof DialogPrimitive.Description>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={clsx(styles.description, className)}
        {...props}
    />
));
Description.displayName = DialogPrimitive.Description.displayName;

export const Close = DialogPrimitive.Close;

export const Dialog = {
    Root,
    Trigger,
    Portal,
    Overlay,
    Content,
    Title,
    Description,
    Close,
};
