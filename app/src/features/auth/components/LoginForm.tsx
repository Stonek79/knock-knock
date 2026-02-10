import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { AppLogo } from "@/components/ui/AppLogo";
import { Button } from "@/components/ui/Button";
import { EmailInput } from "@/components/ui/EmailInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AUTH_MODES, AUTH_VIEW_MODES } from "@/lib/constants";
import { useLoginForm } from "../hooks/useLoginForm";
import styles from "./loginForm.module.css";

interface LoginFormProps {
    onSuccess: () => void;
}

/**
 * Компонент формы авторизации.
 * Содержит UI для входа и регистрации.
 */
export function LoginForm({ onSuccess }: LoginFormProps) {
    const { t } = useTranslation();
    const {
        form,
        submitError,
        authMode,
        viewMode,
        toggleAuthMode,
        toggleViewMode,
        loginSchema,
    } = useLoginForm(onSuccess);

    return (
        <Flex direction="column" gap="5">
            <Box>
                <Flex justify="center" mb="4">
                    <AppLogo width={120} />
                </Flex>
                <Heading size="6" align="center" mb="2">
                    {viewMode === AUTH_VIEW_MODES.LOGIN
                        ? t("auth.loginTitle")
                        : t("auth.registerTitle")}
                </Heading>
                <Text as="p" align="center" color="gray">
                    {t("auth.signInToAccount")}
                </Text>
            </Box>

            {submitError && (
                <Alert variant="destructive">
                    <AlertTitle>{t("auth.error")}</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                </Alert>
            )}

            <form
                autoComplete="off"
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
            >
                <div className={styles.formContainer}>
                    <form.Field
                        name="email"
                        validators={{
                            onChange: ({ value }) => {
                                const result =
                                    loginSchema.shape.email.safeParse(value);
                                return result.success
                                    ? undefined
                                    : t(result.error.issues[0].message);
                            },
                        }}
                    >
                        {(field) => (
                            <Flex direction="column" gap="2">
                                <Text
                                    as="label"
                                    htmlFor={field.name}
                                    size="2"
                                    weight="medium"
                                >
                                    {t("common.email")}
                                </Text>
                                <EmailInput
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    placeholder={t("auth.emailPlaceholder")}
                                />
                                {field.state.meta.isTouched &&
                                field.state.meta.errors.length ? (
                                    <Text color="red" size="1">
                                        {field.state.meta.errors.join(", ")}
                                    </Text>
                                ) : null}
                            </Flex>
                        )}
                    </form.Field>

                    {authMode === AUTH_MODES.PASSWORD && (
                        <form.Field
                            name="password"
                            validators={{
                                onChange: ({ value }) =>
                                    !value ? t("common.required") : undefined,
                            }}
                        >
                            {(field) => (
                                <Flex direction="column" gap="2">
                                    <Text
                                        as="label"
                                        htmlFor={field.name}
                                        size="2"
                                        weight="medium"
                                    >
                                        {t("common.password")}
                                    </Text>
                                    <PasswordInput
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        placeholder={t(
                                            "auth.passwordPlaceholder",
                                        )}
                                    />
                                    {field.state.meta.isTouched &&
                                    field.state.meta.errors.length ? (
                                        <Text color="red" size="1">
                                            {field.state.meta.errors.join(", ")}
                                        </Text>
                                    ) : null}
                                </Flex>
                            )}
                        </form.Field>
                    )}

                    <Flex direction="column" gap="3" mt="2">
                        <form.Subscribe
                            selector={(state) => [
                                state.canSubmit,
                                state.isSubmitting,
                            ]}
                        >
                            {([canSubmit, isSubmitting]) => (
                                <Button
                                    type="submit"
                                    disabled={!canSubmit}
                                    variant="solid"
                                    size="3"
                                    className={styles.submitButton}
                                >
                                    {isSubmitting
                                        ? t("auth.sending")
                                        : viewMode === AUTH_VIEW_MODES.LOGIN
                                          ? t("auth.loginAction")
                                          : t("auth.registerAction")}
                                </Button>
                            )}
                        </form.Subscribe>

                        <Button
                            variant="ghost"
                            size="2"
                            onClick={toggleAuthMode}
                            className={styles.centerButton}
                            type="button"
                        >
                            {authMode === AUTH_MODES.MAGIC_LINK
                                ? t("auth.signInWithPassword")
                                : t("auth.signInWithMagicLink")}
                        </Button>

                        <Flex justify="center" align="center" gap="2" mt="2">
                            <Text size="2" color="gray">
                                {viewMode === AUTH_VIEW_MODES.LOGIN
                                    ? t("auth.noAccount")
                                    : t("auth.hasAccount")}
                            </Text>
                            <Button
                                variant="ghost"
                                size="2"
                                onClick={toggleViewMode}
                                style={{
                                    margin: 0,
                                    padding: 0,
                                    height: "auto",
                                }}
                                type="button"
                            >
                                {viewMode === AUTH_VIEW_MODES.LOGIN
                                    ? t("auth.toRegister")
                                    : t("auth.toLogin")}
                            </Button>
                        </Flex>
                    </Flex>
                </div>
            </form>
        </Flex>
    );
}
