/**
 * Разрешает значение отступа/размера в CSS-переменную нашей дизайн-системы,
 * если это строка от '1' до '9'. Иначе возвращает как есть (например, '100%').
 */
export const resolveToken = (value?: string | number): string | undefined => {
    if (value === undefined || value === null) {
        return undefined;
    }
    const strVal = String(value);

    // Поддержка размеров из Radix: '1' - '9'
    const radixSpaces: Record<string, string> = {
        "1": "var(--space-1)",
        "2": "var(--space-2)",
        "3": "var(--space-3)",
        "4": "var(--space-4)",
        "5": "var(--space-5)",
        "6": "var(--space-6)",
        "7": "var(--space-8)", // маппим 7 на 8 для совместимости
        "8": "var(--space-8)",
        "9": "var(--space-10)", // маппим 9 на 10
    };

    return radixSpaces[strVal] || strVal;
};

/**
 * Базовые свойства макета, поддерживаемые всеми Layout примитивами.
 */
export interface LayoutProps {
    p?: string | number;
    px?: string | number;
    py?: string | number;
    pt?: string | number;
    pr?: string | number;
    pb?: string | number;
    pl?: string | number;
    m?: string | number;
    mx?: string | number;
    my?: string | number;
    mt?: string | number;
    mr?: string | number;
    mb?: string | number;
    ml?: string | number;
    width?: string | number;
    height?: string | number;
    minWidth?: string | number;
    minHeight?: string | number;
    maxWidth?: string | number;
    maxHeight?: string | number;
    position?: "static" | "relative" | "absolute" | "fixed" | "sticky";
    top?: string | number;
    right?: string | number;
    bottom?: string | number;
    left?: string | number;
    flexGrow?: string | number;
    flexShrink?: string | number;
    flexBasis?: string | number;
    display?:
        | "none"
        | "inline"
        | "inline-block"
        | "block"
        | "flex"
        | "inline-flex"
        | "grid";
}

/**
 * Преобразует LayoutProps в React.CSSProperties
 */
export const extractLayoutStyles = (props: LayoutProps) => {
    const styles: React.CSSProperties = {};

    if (props.p !== undefined) {
        styles.padding = resolveToken(props.p);
    }
    if (props.px !== undefined) {
        styles.paddingLeft = resolveToken(props.px);
        styles.paddingRight = resolveToken(props.px);
    }
    if (props.py !== undefined) {
        styles.paddingTop = resolveToken(props.py);
        styles.paddingBottom = resolveToken(props.py);
    }
    if (props.pt !== undefined) {
        styles.paddingTop = resolveToken(props.pt);
    }
    if (props.pr !== undefined) {
        styles.paddingRight = resolveToken(props.pr);
    }
    if (props.pb !== undefined) {
        styles.paddingBottom = resolveToken(props.pb);
    }
    if (props.pl !== undefined) {
        styles.paddingLeft = resolveToken(props.pl);
    }

    if (props.m !== undefined) {
        styles.margin = resolveToken(props.m);
    }
    if (props.mx !== undefined) {
        styles.marginLeft = resolveToken(props.mx);
        styles.marginRight = resolveToken(props.mx);
    }
    if (props.my !== undefined) {
        styles.marginTop = resolveToken(props.my);
        styles.marginBottom = resolveToken(props.my);
    }
    if (props.mt !== undefined) {
        styles.marginTop = resolveToken(props.mt);
    }
    if (props.mr !== undefined) {
        styles.marginRight = resolveToken(props.mr);
    }
    if (props.mb !== undefined) {
        styles.marginBottom = resolveToken(props.mb);
    }
    if (props.ml !== undefined) {
        styles.marginLeft = resolveToken(props.ml);
    }

    if (props.width !== undefined) {
        styles.width = resolveToken(props.width);
    }
    if (props.height !== undefined) {
        styles.height = resolveToken(props.height);
    }
    if (props.minWidth !== undefined) {
        styles.minWidth = resolveToken(props.minWidth);
    }
    if (props.minHeight !== undefined) {
        styles.minHeight = resolveToken(props.minHeight);
    }
    if (props.maxWidth !== undefined) {
        styles.maxWidth = resolveToken(props.maxWidth);
    }
    if (props.maxHeight !== undefined) {
        styles.maxHeight = resolveToken(props.maxHeight);
    }

    if (props.position !== undefined) {
        styles.position = props.position;
    }
    if (props.top !== undefined) {
        styles.top = resolveToken(props.top);
    }
    if (props.right !== undefined) {
        styles.right = resolveToken(props.right);
    }
    if (props.bottom !== undefined) {
        styles.bottom = resolveToken(props.bottom);
    }
    if (props.left !== undefined) {
        styles.left = resolveToken(props.left);
    }

    if (props.flexGrow !== undefined) {
        styles.flexGrow = props.flexGrow;
    }
    if (props.flexShrink !== undefined) {
        styles.flexShrink = props.flexShrink;
    }
    if (props.flexBasis !== undefined) {
        styles.flexBasis = resolveToken(props.flexBasis);
    }
    if (props.display !== undefined) {
        styles.display = props.display;
    }

    return styles;
};
