import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmailInput } from "@/components/ui/EmailInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { TextField } from "@/components/ui/TextField";
import { registerFieldsSchema } from "@/lib/schemas/auth";
import { useAuthForms } from "../../hooks/useAuthForms";
import styles from "../../styles/authForm.module.css";
import { AuthField } from "../AuthField";

export function RegisterForm() {
    const { t } = useTranslation();
    const { registerForm, submitError } = useAuthForms();

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                registerForm.handleSubmit();
            }}
            className={styles.form}
        >
            <Flex direction="column" gap="4">
                {/* Honeypot поле для защиты от ботов (скрыто от пользователей) */}
                <div className={styles.honeypot} aria-hidden="true">
                    <registerForm.Field name="username_bot">
                        {(field) => (
                            <input
                                type="text"
                                name={field.name}
                                value={field.state.value}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                tabIndex={-1}
                                autoComplete="off"
                            />
                        )}
                    </registerForm.Field>
                </div>

                {/* Имя */}
                <registerForm.Field
                    name="display_name"
                    validators={{
                        onBlur: ({ value }) => {
                            if (!value || value.trim() === "") {
                                return undefined;
                            }
                            const res =
                                registerFieldsSchema.shape.display_name.safeParse(
                                    value,
                                );
                            if (res.success) {
                                return undefined;
                            }
                            return t(res.error.issues[0].message);
                        },
                        onChange: ({ value, fieldApi }) => {
                            if (
                                !value ||
                                value.trim() === "" ||
                                fieldApi.state.meta.errors.length === 0
                            ) {
                                return undefined;
                            }
                            const res =
                                registerFieldsSchema.shape.display_name.safeParse(
                                    value,
                                );
                            if (res.success) {
                                return undefined;
                            }
                            return t(res.error.issues[0].message);
                        },
                    }}
                >
                    {(field) => (
                        <AuthField
                            label={t("profile.displayName")}
                            field={field}
                            helperText={t("profile.displayNameHint")}
                        >
                            <TextField
                                value={field.state.value}
                                onChange={(e) => {
                                    field.handleChange(e.target.value);
                                }}
                                placeholder={t("profile.namePlaceholder")}
                                autoComplete="off"
                                spellCheck={false}
                            />
                        </AuthField>
                    )}
                </registerForm.Field>

                {/* Email */}
                <registerForm.Field
                    name="email"
                    validators={{
                        onBlur: ({ value }) => {
                            const res =
                                registerFieldsSchema.shape.email.safeParse(
                                    value,
                                );
                            if (res.success) {
                                return undefined;
                            }
                            return t(res.error.issues[0].message);
                        },
                        onChange: ({ value, fieldApi }) => {
                            if (fieldApi.state.meta.errors.length === 0) {
                                return undefined;
                            }
                            const res =
                                registerFieldsSchema.shape.email.safeParse(
                                    value,
                                );
                            if (res.success) {
                                return undefined;
                            }
                            return t(res.error.issues[0].message);
                        },
                    }}
                >
                    {(field) => (
                        <AuthField label={t("common.email")} field={field}>
                            <EmailInput
                                value={field.state.value}
                                onChange={(e) => {
                                    field.handleChange(e.target.value);
                                }}
                                autoComplete="email"
                                placeholder={t("auth.emailPlaceholder")}
                            />
                        </AuthField>
                    )}
                </registerForm.Field>

                {/* Пароль */}
                <registerForm.Field
                    name="password"
                    validators={{
                        onBlur: ({ value }) => {
                            const res =
                                registerFieldsSchema.shape.password.safeParse(
                                    value,
                                );
                            if (res.success) {
                                return undefined;
                            }
                            return t(res.error.issues[0].message);
                        },
                        onChange: ({ value, fieldApi }) => {
                            if (fieldApi.state.meta.errors.length === 0) {
                                return undefined;
                            }
                            const res =
                                registerFieldsSchema.shape.password.safeParse(
                                    value,
                                );
                            if (res.success) {
                                return undefined;
                            }
                            return t(res.error.issues[0].message);
                        },
                    }}
                >
                    {(field) => (
                        <AuthField label={t("common.password")} field={field}>
                            <PasswordInput
                                value={field.state.value}
                                onChange={(e) => {
                                    field.handleChange(e.target.value);
                                }}
                                autoComplete="new-password"
                                placeholder={t("auth.passwordPlaceholder")}
                            />
                        </AuthField>
                    )}
                </registerForm.Field>

                {/* Подтверждение */}
                <registerForm.Field
                    name="passwordConfirm"
                    validators={{
                        onBlur: ({ value, fieldApi }) => {
                            const pass =
                                fieldApi.form.getFieldValue("password");
                            if (value === pass) {
                                return undefined;
                            }
                            return t("auth.passwordsNotMatch");
                        },
                        onChange: ({ value, fieldApi }) => {
                            if (fieldApi.state.meta.errors.length === 0) {
                                return undefined;
                            }
                            const pass =
                                fieldApi.form.getFieldValue("password");
                            if (value === pass) {
                                return undefined;
                            }
                            return t("auth.passwordsNotMatch");
                        },
                    }}
                >
                    {(field) => (
                        <AuthField
                            label={t("profile.confirmPassword")}
                            field={field}
                        >
                            <PasswordInput
                                value={field.state.value}
                                onChange={(e) => {
                                    field.handleChange(e.target.value);
                                }}
                                autoComplete="new-password"
                                placeholder={t("auth.passwordPlaceholder")}
                            />
                        </AuthField>
                    )}
                </registerForm.Field>

                {/* Чекбокс — здесь onChange оправдан */}
                <registerForm.Field
                    name="agreeToTerms"
                    validators={{
                        onChange: ({ value }) => {
                            if (value) {
                                return undefined;
                            }
                            return t("auth.mustAgreeToTerms");
                        },
                    }}
                >
                    {(field) => (
                        <AuthField label="" field={field}>
                            <Flex align="center" gap="2">
                                <Checkbox
                                    checked={field.state.value}
                                    onCheckedChange={(c) => {
                                        field.handleChange(!!c);
                                    }}
                                />
                                <span className={styles.checkboxLabel}>
                                    {t("auth.iAgreeToTerms")}
                                </span>
                            </Flex>
                        </AuthField>
                    )}
                </registerForm.Field>

                {/* Глобальная ошибка сабмита */}
                {submitError && (
                    <Alert variant="danger">
                        <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                )}

                <registerForm.Subscribe
                    selector={(s) => [s.canSubmit, s.isSubmitting]}
                >
                    {([canSubmit, isSubmitting]) => (
                        <Button
                            type="submit"
                            disabled={!canSubmit || isSubmitting}
                            variant="solid"
                            className={styles.submitButton}
                        >
                            {isSubmitting
                                ? t("auth.sending")
                                : t("auth.registerAction")}
                        </Button>
                    )}
                </registerForm.Subscribe>
            </Flex>
        </form>
    );
}
