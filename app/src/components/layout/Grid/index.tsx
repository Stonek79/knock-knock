import clsx from "clsx";
import {
    type CSSProperties,
    type ElementType,
    forwardRef,
    type HTMLAttributes,
} from "react";
import { extractLayoutStyles, type LayoutProps, resolveToken } from "../utils";
import styles from "./grid.module.css";

export interface GridProps extends HTMLAttributes<HTMLDivElement>, LayoutProps {
    as?: ElementType;
    columns?: string | number;
    rows?: string | number;
    gap?: string | number;
    gapX?: string | number;
    gapY?: string | number;
    align?: "start" | "center" | "end" | "baseline" | "stretch";
    justify?: "start" | "center" | "end" | "between" | "around";
}

const resolveGridTemplate = (val?: string | number) => {
    if (!val) {
        return undefined;
    }
    const strVal = String(val);
    if (!Number.isNaN(Number(strVal)) && Number(strVal) > 0) {
        return `repeat(${strVal}, minmax(0, 1fr))`;
    }
    return strVal;
};

/**
 * Грид-контейнер, аналог Grid из @radix-ui/themes
 */
export const Grid = forwardRef<HTMLElement, GridProps>(
    (
        {
            as: Component = "div",
            className,
            style,
            columns,
            rows,
            gap,
            gapX,
            gapY,
            align,
            justify,
            children,
            ...props
        },
        ref,
    ) => {
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

        const combinedStyle: CSSProperties & {
            "--grid-cols"?: string;
            "--grid-rows"?: string;
        } = { ...layoutStyles, ...style };

        if (columns) {
            const resolved = resolveGridTemplate(columns);
            if (resolved) {
                combinedStyle["--grid-cols"] = resolved;
            }
        }
        if (rows) {
            const resolved = resolveGridTemplate(rows);
            if (resolved) {
                combinedStyle["--grid-rows"] = resolved;
            }
        }
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
                    styles.grid,
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

Grid.displayName = "Grid";
