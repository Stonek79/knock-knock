import * as SelectPrimitive from "@radix-ui/react-select";
import clsx from "clsx";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import {
    type ComponentPropsWithoutRef,
    type ComponentRef,
    forwardRef,
} from "react";
import { ICON_SIZE } from "@/lib/constants";
import styles from "./select.module.css";

export const Root = SelectPrimitive.Root;
export const Group = SelectPrimitive.Group;
export const Value = SelectPrimitive.Value;
export const Portal = SelectPrimitive.Portal;

export const Trigger = forwardRef<
    ComponentRef<typeof SelectPrimitive.Trigger>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
        ref={ref}
        className={clsx(styles.trigger, className)}
        {...props}
    >
        {children}
        <SelectPrimitive.Icon asChild>
            <ChevronDown size={ICON_SIZE.sm} className={styles.icon} />
        </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
));
Trigger.displayName = SelectPrimitive.Trigger.displayName;

export const Content = forwardRef<
    ComponentRef<typeof SelectPrimitive.Content>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
    <Portal>
        <SelectPrimitive.Content
            ref={ref}
            className={clsx(
                styles.content,
                position === "popper" && styles.popper,
                className,
            )}
            position={position}
            {...props}
        >
            <SelectPrimitive.ScrollUpButton className={styles.scrollButton}>
                <ChevronUp size={ICON_SIZE.sm} />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport
                className={clsx(
                    styles.viewport,
                    position === "popper" && styles.popperViewport,
                )}
            >
                {children}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className={styles.scrollButton}>
                <ChevronDown size={ICON_SIZE.sm} />
            </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
    </Portal>
));
Content.displayName = SelectPrimitive.Content.displayName;

export const Item = forwardRef<
    ComponentRef<typeof SelectPrimitive.Item>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
        ref={ref}
        className={clsx(styles.item, className)}
        {...props}
    >
        <span className={styles.itemIndicatorWrapper}>
            <SelectPrimitive.ItemIndicator>
                <Check size={ICON_SIZE.sm} />
            </SelectPrimitive.ItemIndicator>
        </span>
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
));
Item.displayName = SelectPrimitive.Item.displayName;

export const Label = forwardRef<
    ComponentRef<typeof SelectPrimitive.Label>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.Label
        ref={ref}
        className={clsx(styles.label, className)}
        {...props}
    />
));
Label.displayName = SelectPrimitive.Label.displayName;

export const Separator = forwardRef<
    ComponentRef<typeof SelectPrimitive.Separator>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.Separator
        ref={ref}
        className={clsx(styles.separator, className)}
        {...props}
    />
));
Separator.displayName = SelectPrimitive.Separator.displayName;

export const Select = {
    Root,
    Group,
    Value,
    Trigger,
    Content,
    Label,
    Item,
    Separator,
};
