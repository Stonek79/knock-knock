import clsx from "clsx";
import {
    type CSSProperties,
    type ElementType,
    forwardRef,
    type HTMLAttributes,
} from "react";
import { extractLayoutStyles, type LayoutProps, resolveToken } from "../utils";
import styles from "./flex.module.css";

export interface FlexProps extends HTMLAttributes<HTMLDivElement>, LayoutProps {
    as?: ElementType;
    direction?: "row" | "column" | "row-reverse" | "column-reverse";
    align?: "start" | "center" | "end" | "baseline" | "stretch";
    justify?: "start" | "center" | "end" | "between" | "around";
    wrap?: "nowrap" | "wrap" | "wrap-reverse";
    gap?: string | number;
    gapX?: string | number;
    gapY?: string | number;
}

/**
 * Гибкий контейнер, аналог Flex из @radix-ui/themes
 */
export const Flex = forwardRef<HTMLElement, FlexProps>(
    (
        {
            as: Component = "div",
            className,
            style,
            direction,
            align,
            justify,
            wrap,
            gap,
            gapX,
            gapY,
            children,
            ...props
        },
        ref,
    ) => {
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

        const combinedStyle: CSSProperties = {
            ...layoutStyles,
            ...style,
        };

        if (gap !== undefined) {
            combinedStyle.gap = resolveToken(gap);
        }
        if (gapX !== undefined) {
            combinedStyle.columnGap = resolveToken(gapX);
        }
        if (gapY !== undefined) {
            combinedStyle.rowGap = resolveToken(gapY);
        }

        return (
            <Component
                ref={ref}
                className={clsx(
                    styles.flex,
                    direction &&
                        styles[
                            `direction${direction.charAt(0).toUpperCase() + direction.slice(1)}`
                        ],
                    wrap &&
                        styles[
                            `wrap${wrap.charAt(0).toUpperCase() + wrap.slice(1)}`
                        ],
                    align &&
                        styles[
                            `align${align.charAt(0).toUpperCase() + align.slice(1)}`
                        ],
                    justify &&
                        styles[
                            `justify${justify.charAt(0).toUpperCase() + justify.slice(1)}`
                        ],
                    className,
                )}
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

Flex.displayName = "Flex";
