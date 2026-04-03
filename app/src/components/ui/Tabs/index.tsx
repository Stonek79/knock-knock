import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import styles from "./tabs.module.css";

interface TabsProps {
    defaultValue: string;
    onValueChange?: (value: string) => void;
    children: ReactNode;
    className?: string;
    value?: string;
}

export function Tabs({
    defaultValue,
    onValueChange,
    children,
    className,
    value,
}: TabsProps) {
    return (
        <TabsPrimitive.Root
            defaultValue={defaultValue}
            onValueChange={onValueChange}
            className={className}
            value={value}
        >
            {children}
        </TabsPrimitive.Root>
    );
}

Tabs.List = function TabsList({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <TabsPrimitive.List className={`${styles.list} ${className || ""}`}>
            {children}
        </TabsPrimitive.List>
    );
};

Tabs.Trigger = function TabsTrigger({
    value,
    children,
    className,
}: {
    value: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <TabsPrimitive.Trigger
            value={value}
            className={`${styles.trigger} ${className || ""}`}
        >
            {children}
        </TabsPrimitive.Trigger>
    );
};

Tabs.Content = function TabsContent({
    value,
    children,
    className,
}: {
    value: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <TabsPrimitive.Content
            value={value}
            className={`${styles.content} ${className || ""}`}
        >
            {children}
        </TabsPrimitive.Content>
    );
};
