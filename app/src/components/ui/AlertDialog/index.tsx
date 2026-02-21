import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import clsx from "clsx";
import {
    type ComponentPropsWithoutRef,
    type ComponentRef,
    forwardRef,
} from "react";
import styles from "./alert-dialog.module.css";

export const Root = AlertDialogPrimitive.Root;
export const Trigger = AlertDialogPrimitive.Trigger;
export const Portal = AlertDialogPrimitive.Portal;

export const Overlay = forwardRef<
    ComponentRef<typeof AlertDialogPrimitive.Overlay>,
    ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Overlay
        ref={ref}
        className={clsx(styles.overlay, className)}
        {...props}
    />
));
Overlay.displayName = AlertDialogPrimitive.Overlay.displayName;

export const Content = forwardRef<
    ComponentRef<typeof AlertDialogPrimitive.Content>,
    ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
    <Portal>
        <Overlay />
        <AlertDialogPrimitive.Content
            ref={ref}
            className={clsx(styles.content, className)}
            {...props}
        />
    </Portal>
));
Content.displayName = AlertDialogPrimitive.Content.displayName;

export const Title = forwardRef<
    ComponentRef<typeof AlertDialogPrimitive.Title>,
    ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Title
        ref={ref}
        className={clsx(styles.title, className)}
        {...props}
    />
));
Title.displayName = AlertDialogPrimitive.Title.displayName;

export const Description = forwardRef<
    ComponentRef<typeof AlertDialogPrimitive.Description>,
    ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Description
        ref={ref}
        className={clsx(styles.description, className)}
        {...props}
    />
));
Description.displayName = AlertDialogPrimitive.Description.displayName;

export const Action = AlertDialogPrimitive.Action;
export const Cancel = AlertDialogPrimitive.Cancel;

export const AlertDialog = {
    Root,
    Trigger,
    Portal,
    Overlay,
    Content,
    Title,
    Description,
    Action,
    Cancel,
};
