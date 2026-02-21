import clsx from "clsx";
import { type ElementType, forwardRef, type HTMLAttributes } from "react";
import { extractLayoutStyles, type LayoutProps } from "../utils";
import styles from "./box.module.css";

export interface BoxProps extends HTMLAttributes<HTMLDivElement>, LayoutProps {
    as?: ElementType;
}

/**
 * Универсальный контейнер, аналог Box из @radix-ui/themes
 */
export const Box = forwardRef<HTMLElement, BoxProps>(
    ({ as: Component = "div", className, style, children, ...props }, ref) => {
        // Извлекаем Layout-специфичные пропсы
        const {
            p,
            px,
            py,
            pt,
            pr,
            pb,
            pl,
            m,
            mx,
            my,
            mt,
            mr,
            mb,
            ml,
            width,
            height,
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            position,
            top,
            right,
            bottom,
            left,
            flexGrow,
            flexShrink,
            flexBasis,
            display,
            ...rest
        } = props;

        const layoutStyles = extractLayoutStyles({
            p,
            px,
            py,
            pt,
            pr,
            pb,
            pl,
            m,
            mx,
            my,
            mt,
            mr,
            mb,
            ml,
            width,
            height,
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            position,
            top,
            right,
            bottom,
            left,
            flexGrow,
            flexShrink,
            flexBasis,
            display,
        });

        const combinedStyle = { ...layoutStyles, ...style };

        return (
            <Component
                ref={ref}
                className={clsx(styles.box, className)}
                style={
                    Object.keys(combinedStyle).length > 0
                        ? combinedStyle
                        : undefined
                }
                {...rest}
            >
                {children}
            </Component>
        );
    },
);

Box.displayName = "Box";
