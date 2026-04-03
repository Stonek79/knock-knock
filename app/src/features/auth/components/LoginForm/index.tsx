import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmailInput } from "@/components/ui/EmailInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { loginSchema } from "@/lib/schemas/auth";
import { useAuthForms } from "../../hooks/useAuthForms";
import styles from "../../styles/authForm.module.css";
import { AuthField } from "../AuthField";

export function LoginForm() {
    const { t } = useTranslation();
    const { loginForm, submitError } = useAuthForms();

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                loginForm.handleSubmit();
            }}
            className={styles.form}
        >
            <Flex direction="column" gap="4">
                {/* Email */}
                <loginForm.Field
                    name="email"
                    validators={{
                        onBlur: ({ value }) => {
                            const res =
                                loginSchema.shape.email.safeParse(value);
                            return res.success
                                ? undefined
                                : t(res.error.issues[0].message);
                        },
                        onChange: ({ value, fieldApi }) => {
                            if (fieldApi.state.meta.errors.length === 0) {
                                return undefined;
                            }
                            const res =
                                loginSchema.shape.email.safeParse(value);
                            return res.success
                                ? undefined
                                : t(res.error.issues[0].message);
                        },
                    }}
                >
                    {(field) => (
                        <AuthField label={t("common.email")} field={field}>
                            <EmailInput
                                value={field.state.value}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                autoComplete="email"
                                placeholder={t("auth.emailPlaceholder")}
                            />
                        </AuthField>
                    )}
                </loginForm.Field>

                {/* Пароль */}
                <loginForm.Field
                    name="password"
                    validators={{
                        onBlur: ({ value }) => {
                            const res =
                                loginSchema.shape.password.safeParse(value);
                            return res.success
                                ? undefined
                                : t(res.error.issues[0].message);
                        },
                        onChange: ({ value, fieldApi }) => {
                            if (fieldApi.state.meta.errors.length === 0) {
                                return undefined;
                            }
                            const res =
                                loginSchema.shape.password.safeParse(value);
                            return res.success
                                ? undefined
                                : t(res.error.issues[0].message);
                        },
                    }}
                >
                    {(field) => (
                        <AuthField label={t("common.password")} field={field}>
                            <PasswordInput
                                value={field.state.value}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                autoComplete="current-password"
                                placeholder={t("auth.passwordPlaceholder")}
                            />
                        </AuthField>
                    )}
                </loginForm.Field>

                {/* Ошибка сабмита логина */}
                {submitError && (
                    <Alert variant="danger">
                        <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                )}

                <loginForm.Subscribe
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
                                : t("auth.loginAction")}
                        </Button>
                    )}
                </loginForm.Subscribe>
            </Flex>
        </form>
    );
}
