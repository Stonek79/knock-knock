import { useForm } from "@tanstack/react-form";
import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { VERIFY_STATUS } from "@/lib/constants";
import { authRepository } from "@/lib/repositories/auth.repository";
import type { VerifyStatus } from "@/lib/types";
import styles from "./change-password.module.css";

export function ChangePasswordForm() {
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{
        type: VerifyStatus;
        message: string;
    } | null>(null);

    const form = useForm({
        defaultValues: { oldPassword: "", password: "", confirmPassword: "" },
        onSubmit: async ({ value }) => {
            if (value.password !== value.confirmPassword) {
                setStatus({
                    type: VERIFY_STATUS.ERROR,
                    message: t("settings.account.passwordsNotMatch"),
                });
                return;
            }

            setIsSubmitting(true);
            const result = await authRepository.changePassword(
                value.oldPassword,
                value.password,
                value.confirmPassword,
            );
            setIsSubmitting(false);

            if (result.isOk()) {
                setStatus({
                    type: VERIFY_STATUS.VERIFIED,
                    message: t("settings.account.changeSuccess"),
                });
                form.reset();
            } else {
                setStatus({
                    type: VERIFY_STATUS.ERROR,
                    message: result.error.message,
                });
            }
        },
    });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
            }}
            className={styles.formWrapper}
        >
            <form.Field name="oldPassword">
                {(field) => (
                    <PasswordInput
                        placeholder={t("settings.account.oldPassword")}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                    />
                )}
            </form.Field>
            <form.Field name="password">
                {(field) => (
                    <PasswordInput
                        placeholder={t("settings.account.newPassword")}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                    />
                )}
            </form.Field>
            <form.Field name="confirmPassword">
                {(field) => (
                    <PasswordInput
                        placeholder={t("settings.account.confirmPassword")}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                    />
                )}
            </form.Field>

            {status && (
                <div className={clsx(styles.statusText, styles[status.type])}>
                    {status.message}
                </div>
            )}

            <Button type="submit" disabled={isSubmitting} variant="solid">
                {isSubmitting ? t("common.saving") : t("common.save")}
            </Button>
        </form>
    );
}
