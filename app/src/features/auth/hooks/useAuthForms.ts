import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthService } from "@/lib/services/auth";
import { ChatRealtimeService } from "@/lib/services/chat-realtime";

export function useAuthForms() {
    const { t } = useTranslation();
    const [submitError, setSubmitError] = useState<string | null>(null);

    // --- ФОРМА ВХОДА ---
    const loginForm = useForm({
        defaultValues: { email: "", password: "" },
        onSubmit: async ({ value }) => {
            setSubmitError(null);
            ChatRealtimeService.destroy();

            const result = await AuthService.loginWithPassword(
                value.email,
                value.password,
            );

            if (result.isOk()) {
                return true;
            } else {
                setSubmitError(
                    t(result.error.message || "auth.errors.invalidCredentials"),
                );
                return false;
            }
        },
    });

    // --- ФОРМА РЕГИСТРАЦИИ ---
    const registerForm = useForm({
        defaultValues: {
            email: "",
            display_name: "",
            password: "",
            passwordConfirm: "",
            agreeToTerms: false,
            username_bot: "", // Honeypot
        },
        onSubmit: async ({ value }) => {
            if (value.username_bot) {
                return;
            } // Игнорируем бота

            setSubmitError(null);

            ChatRealtimeService.destroy();

            // 1. Регистрация (Email + Password)
            const regResult = await AuthService.register(
                value.email,
                value.password,
            );

            if (regResult.isOk()) {
                // 2. Автоматический вход для получения токена
                const loginResult = await AuthService.loginWithPassword(
                    value.email,
                    value.password,
                );

                if (loginResult.isOk()) {
                    // 3. Обновление отображаемого имени
                    if (value.display_name) {
                        await AuthService.updateMe({
                            display_name: value.display_name,
                        });
                    }
                } else {
                    setSubmitError(t("auth.errors.loginAfterRegisterFailed"));
                }
            } else {
                setSubmitError(
                    t(regResult.error.message || "auth.errors.registerFailed"),
                );
            }
        },
    });

    return {
        loginForm,
        registerForm,
        submitError,
    };
}
