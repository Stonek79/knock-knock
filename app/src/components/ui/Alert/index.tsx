import { Callout } from "@radix-ui/themes";
import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import styles from "./alert.module.css";

/**
 * Свойства компонента Alert.
 */
export interface AlertProps extends VariableAlertProps {
    /** Вариант стиля уведомления */
    variant?: "default" | "destructive" | "success";
    /** Заголовок уведомления (опционально) */
    title?: string;
    /** Отображать ли иконку (по умолчанию true) */
    icon?: boolean;
}

type VariableAlertProps = Omit<HTMLAttributes<HTMLDivElement>, "color">;

/**
 * Компонент уведомления (Alert).
 * Обертка над Radix Themes Callout.
 */
const Alert = forwardRef<HTMLDivElement, AlertProps>(
    ({ children, variant = "default", title, icon = true, ...props }, ref) => {
        let color: "blue" | "red" | "green" = "blue";
        let IconComponent = Info;

        if (variant === "destructive") {
            color = "red";
            IconComponent = TriangleAlert;
        } else if (variant === "success") {
            color = "green";
            IconComponent = CircleCheck;
        }

        return (
            <Callout.Root color={color} ref={ref} {...props}>
                {icon && (
                    <Callout.Icon>
                        <IconComponent size={16} />
                    </Callout.Icon>
                )}
                <Callout.Text>
                    {title && <strong className={styles.title}>{title}</strong>}
                    {children}
                </Callout.Text>
            </Callout.Root>
        );
    },
);
Alert.displayName = "Alert";

const AlertTitle = ({ children }: { children: ReactNode }) => (
    <strong className={styles.alertTitle}>{children}</strong>
);
const AlertDescription = ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
);

export { Alert, AlertTitle, AlertDescription };
