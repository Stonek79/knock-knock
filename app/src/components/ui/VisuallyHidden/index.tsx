import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Компонент для скрытия элементов визуально, но сохранения доступности для screen readers.
 */
export function VisuallyHidden(
    props: ComponentPropsWithoutRef<typeof VisuallyHiddenPrimitive.Root>,
) {
    return <VisuallyHiddenPrimitive.Root {...props} />;
}
