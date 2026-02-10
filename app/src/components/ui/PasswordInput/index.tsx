import { TextField } from "@radix-ui/themes";
import { Eye, EyeOff } from "lucide-react";
import { type ComponentPropsWithoutRef, forwardRef, useState } from "react";
import styles from "./styles.module.css";

type PasswordInputProps = ComponentPropsWithoutRef<typeof TextField.Root>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        const toggleVisibility = () => setShowPassword(!showPassword);

        return (
            <TextField.Root
                className={className}
                ref={ref}
                type={showPassword ? "text" : "password"}
                {...props}
            >
                <TextField.Slot side="right">
                    <button
                        type="button"
                        onClick={toggleVisibility}
                        className={styles.toggleButton}
                        aria-label={
                            showPassword ? "Hide password" : "Show password"
                        }
                    >
                        {showPassword ? (
                            <EyeOff size={16} />
                        ) : (
                            <Eye size={16} />
                        )}
                    </button>
                </TextField.Slot>
            </TextField.Root>
        );
    },
);

PasswordInput.displayName = "PasswordInput";
