import { Mail } from "lucide-react";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { TextField } from "../TextField";

/**
 * Пропсы компонента EmailInput.
 * Наследует все пропсы нашего кастомного TextField.
 */
type EmailInputProps = Omit<ComponentPropsWithoutRef<typeof TextField>, "type">;

/**
 * Компонент поля ввода email.
 * Обёртка над кастомным TextField с иконкой Mail.
 *
 * @example
 * <EmailInput placeholder="your@email.com" />
 */
export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
    ({ className, ...props }, ref) => {
        return (
            <TextField ref={ref} type="email" className={className} {...props}>
                <TextField.Slot>
                    <Mail size="var(--size-icon-sm)" />
                </TextField.Slot>
            </TextField>
        );
    },
);

EmailInput.displayName = "EmailInput";
