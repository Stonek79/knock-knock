import clsx from "clsx";
import { type ElementType, forwardRef, type HTMLAttributes } from "react";
import { extractLayoutStyles, type LayoutProps } from "../utils";
import styles from "./container.module.css";

export interface ContainerProps
    extends HTMLAttributes<HTMLDivElement>,
        LayoutProps {
    as?: ElementType;
    size?: "1" | "2" | "3" | "4";
}

/**
 * Контейнер-центровщик, аналог Container из @radix-ui/themes
 */
export const Container = forwardRef<HTMLElement, ContainerProps>(
    (
        { as: Component = "div", className, style, size, children, ...props },
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

        // Контейнер обычно центрирует себя через margin
        // Если margin не передан в пропсах, задаём дефолтные отступы для контейнера
        if (layoutStyles.marginLeft === undefined) {
            layoutStyles.marginLeft = "auto";
        }
        if (layoutStyles.marginRight === undefined) {
            layoutStyles.marginRight = "auto";
        }

        const combinedStyle = { ...layoutStyles, ...style };

        return (
            <Component
                ref={ref}
                className={clsx(
                    styles.container,
                    size && styles[`size${size}`],
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

Container.displayName = "Container";
