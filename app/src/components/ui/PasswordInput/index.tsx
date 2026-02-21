import { Eye, EyeOff } from "lucide-react";
import { type ComponentPropsWithoutRef, forwardRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { TextField } from "../TextField";
import styles from "./styles.module.css";

export const INPUT_TYPE = {
    TEXT: "text",
    PASSWORD: "password",
} as const;

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
        const { t } = useTranslation();
        const [showPassword, setShowPassword] = useState(false);

        /** Переключение видимости пароля */
        const toggleVisibility = () => setShowPassword((prev) => !prev);

        return (
            <TextField
                ref={ref}
                type={showPassword ? INPUT_TYPE.TEXT : INPUT_TYPE.PASSWORD}
                className={className}
                {...props}
            >
                <TextField.Slot>
                    <button
                        type="button"
                        onClick={toggleVisibility}
                        className={styles.toggleButton}
                        aria-label={
                            showPassword
                                ? t("common.hidePassword")
                                : t("common.showPassword")
                        }
                    >
                        {showPassword ? (
                            <EyeOff size={ICON_SIZE.sm} />
                        ) : (
                            <Eye size={ICON_SIZE.sm} />
                        )}
                    </button>
                </TextField.Slot>
            </TextField>
        );
    },
);

PasswordInput.displayName = "PasswordInput";
