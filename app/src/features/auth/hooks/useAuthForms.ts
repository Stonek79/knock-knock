import { useForm } from "@tanstack/react-form";
import { useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthService } from "@/lib/services/auth";
import { ChatRealtimeService } from "@/lib/services/chat-realtime";

/**
 * Хук для управления формами входа и регистрации.
 * Изолирован от PocketBase SDK через AuthService.
 *
 * Логин: email + пароль без дополнительных meta-параметров.
 * Регистрация: email + пароль + display_name + защита от ботов (Honeypot + Time-check).
 */
export function useAuthForms() {
    const { t } = useTranslation();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [startTime] = useState(Date.now());
    const search = useSearch({ strict: false });
    const initialInviteCode = (search as { invite?: string }).invite || "";

    // --- ФОРМА ВХОДА ---
    // Anti-bot поля не нужны при логине — PocketBase проверяет только credentials.
    // Передача лишних параметров (_startTime, username_bot) в authWithPassword
    // вызывает 400 Bad Request, т.к. PocketBase их не принимает.
    const loginForm = useForm({
        defaultValues: {
            username: "",
            password: "",
        },
        onSubmit: async ({ value }) => {
            setSubmitError(null);
            ChatRealtimeService.destroy();

            const result = await AuthService.loginWithPassword(
                value.username,
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
            username: "",
            invite_code: initialInviteCode,
            display_name: "",
            password: "",
            passwordConfirm: "",
            agreeToTerms: false,
            username_bot: "", // Honeypot (скрытое поле для ловли ботов)
            _startTime: startTime.toString(),
        },
        onSubmit: async ({ value }) => {
            if (value.username_bot) {
                return;
            } // Игнорируем бота

            setSubmitError(null);

            ChatRealtimeService.destroy();

            // 1. Регистрация (Username + Password + Invite + meta)
            const regResult = await AuthService.register(
                value.username,
                value.password,
                value.invite_code,
                {
                    display_name: value.display_name.trim(),
                    _startTime: value._startTime,
                    username_bot: value.username_bot,
                },
            );

            if (regResult.isOk()) {
                // 2. Автоматический вход для получения токена
                const loginResult = await AuthService.loginWithPassword(
                    value.username,
                    value.password,
                );

                if (!loginResult.isOk()) {
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
