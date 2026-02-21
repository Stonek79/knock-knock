import { Eye, EyeOff } from "lucide-react";
import { type ComponentPropsWithoutRef, forwardRef, useState } from "react";
import { TextField } from "../TextField";
import styles from "./styles.module.css";

/**
 * Пропсы компонента PasswordInput.
 * Наследует все пропсы нашего кастомного TextField.
 */
type PasswordInputProps = Omit<
    ComponentPropsWithoutRef<typeof TextField>,
    "type"
>;

/**
 * Компонент поля ввода пароля с переключателем видимости.
 * Обёртка над кастомным TextField с кнопкой Eye/EyeOff.
 *
 * @example
 * <PasswordInput placeholder="Введите пароль" />
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        /** Переключение видимости пароля */
        const toggleVisibility = () => setShowPassword((prev) => !prev);

        return (
            <TextField
                ref={ref}
                type={showPassword ? "text" : "password"}
                className={className}
                {...props}
            >
                <TextField.Slot side="right">
                    <button
                        type="button"
                        onClick={toggleVisibility}
                        className={styles.toggleButton}
                        aria-label={
                            showPassword ? "Скрыть пароль" : "Показать пароль"
                        }
                    >
                        {showPassword ? (
                            <EyeOff size="var(--size-icon-sm)" />
                        ) : (
                            <Eye size="var(--size-icon-sm)" />
                        )}
                    </button>
                </TextField.Slot>
            </TextField>
        );
    },
);

PasswordInput.displayName = "PasswordInput";
