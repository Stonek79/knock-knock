import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import {
    type ComponentPropsWithoutRef,
    type ComponentRef,
    forwardRef,
} from "react";
import styles from "./dropdown-menu.module.css";

export const Root = DropdownMenuPrimitive.Root;
export const Trigger = DropdownMenuPrimitive.Trigger;
export const Portal = DropdownMenuPrimitive.Portal;

export const Content = forwardRef<
    ComponentRef<typeof DropdownMenuPrimitive.Content>,
    ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
    <Portal>
        <DropdownMenuPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={clsx(styles.content, className)}
            {...props}
        />
    </Portal>
));
Content.displayName = DropdownMenuPrimitive.Content.displayName;

export const Item = forwardRef<
    ComponentRef<typeof DropdownMenuPrimitive.Item>,
    ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
        intent?: "danger" | "neutral" | "primary";
    }
>(({ className, intent = "neutral", ...props }, ref) => (
    <DropdownMenuPrimitive.Item
        ref={ref}
        className={clsx(styles.item, styles[`intent-${intent}`], className)}
        {...props}
    />
));
Item.displayName = DropdownMenuPrimitive.Item.displayName;

export const Separator = forwardRef<
    ComponentRef<typeof DropdownMenuPrimitive.Separator>,
    ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator
        ref={ref}
        className={clsx(styles.separator, className)}
        {...props}
    />
));
Separator.displayName = DropdownMenuPrimitive.Separator.displayName;

export const Label = forwardRef<
    ComponentRef<typeof DropdownMenuPrimitive.Label>,
    ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
        ref={ref}
        className={clsx(styles.label, className)}
        {...props}
    />
));
Label.displayName = DropdownMenuPrimitive.Label.displayName;

export const DropdownMenu = {
    Root,
    Trigger,
    Portal,
    Content,
    Item,
    Separator,
    Label,
};
