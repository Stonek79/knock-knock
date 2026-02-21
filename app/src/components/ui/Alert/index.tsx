import clsx from "clsx";
import {
    AlertCircle,
    CheckCircle,
    Info,
    type LucideIcon,
    TriangleAlert,
} from "lucide-react";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import type { ComponentIntent } from "@/lib/types/ui";
import styles from "./alert.module.css";

/**
 * Свойства компонента Alert.
 */
export interface AlertProps
    extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
    /** Вариант (намерение) уведомления */
    variant?: ComponentIntent;
    /** Заголовок уведомления (опционально) */
    title?: string;
    /** Отображать ли иконку (по умолчанию true) */
    icon?: boolean;
}

/**
 * Маппинг иконок на варианты.
 */
const ICON_MAP: Partial<Record<ComponentIntent, LucideIcon>> = {
    info: Info,
    success: CheckCircle,
    warning: TriangleAlert,
    danger: AlertCircle,
    neutral: Info,
};

/**
 * Компонент уведомления (Alert).
 * Замена Radix Themes Callout.
 */
const Alert = forwardRef<HTMLDivElement, AlertProps>(
    (
        { children, variant = "info", title, icon = true, className, ...props },
        ref,
    ) => {
        const IconComponent = ICON_MAP[variant] || Info;

        const rootClasses = clsx(styles.alert, styles[variant], className);

        return (
            <div className={rootClasses} ref={ref} role="alert" {...props}>
                {icon && (
                    <div className={styles.iconWrapper}>
                        <IconComponent className={styles.icon} />
                    </div>
                )}
                <div className={styles.content}>
                    {title && <h5 className={styles.title}>{title}</h5>}
                    <div className={styles.description}>{children}</div>
                </div>
            </div>
        );
    },
);
Alert.displayName = "Alert";

const AlertTitle = ({ children }: { children: ReactNode }) => (
    <h5 className={styles.title}>{children}</h5>
);

const AlertDescription = ({ children }: { children: ReactNode }) => (
    <div className={styles.description}>{children}</div>
);

export { Alert, AlertTitle, AlertDescription };
