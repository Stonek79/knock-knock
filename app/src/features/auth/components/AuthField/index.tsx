import { cloneElement, isValidElement, type ReactElement } from "react";
import { Flex } from "@/components/layout/Flex";
import styles from "./authField.module.css";

/**
 * Описываем минимальный контракт поля, который нам нужен.
 */
interface MinimalFieldApi {
    name: string;
    handleBlur: () => void;
    state: {
        meta: {
            isTouched: boolean;
            errors: (string | undefined | null | unknown)[];
        };
    };
    form: {
        state: {
            submissionAttempts: number;
        };
    };
}

interface ValidatedInputProps {
    id?: string;
    onBlur?: () => void;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
}

interface AuthFieldProps<TField extends MinimalFieldApi> {
    label: string;
    field: TField;
    children: ReactElement<ValidatedInputProps>;
    className?: string;
}

/**
 * Обертка для полей с использованием структурной типизации (Duck Typing).
 */
export function AuthField<TField extends MinimalFieldApi>({
    label,
    field,
    children,
    className,
}: AuthFieldProps<TField>) {
    const { errors, isTouched } = field.state.meta;
    const { submissionAttempts } = field.form.state;

    const hasError =
        (isTouched || submissionAttempts > 0) &&
        errors.length > 0 &&
        errors[0] !== null &&
        errors[0] !== undefined;
    const errorId = `${field.name}-error`;

    if (!isValidElement(children)) {
        return null;
    }

    return (
        <Flex direction="column" gap="1" className={className}>
            <label htmlFor={field.name} className={styles.label}>
                {label}
            </label>
            {cloneElement(children, {
                id: field.name,
                onBlur: field.handleBlur,
                "aria-invalid": hasError,
                "aria-describedby": hasError ? errorId : undefined,
            })}
            {hasError && (
                <span id={errorId} className={styles.error} role="alert">
                    {String(errors[0])}
                </span>
            )}
        </Flex>
    );
}
