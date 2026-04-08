import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
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

    // --- ФОРМА ВХОДА ---
    // Anti-bot поля не нужны при логине — PocketBase проверяет только credentials.
    // Передача лишних параметров (_startTime, username_bot) в authWithPassword
    // вызывает 400 Bad Request, т.к. PocketBase их не принимает.
    const loginForm = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
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
            username_bot: "", // Honeypot (скрытое поле для ловли ботов)
            _startTime: startTime.toString(),
        },
        onSubmit: async ({ value }) => {
            if (value.username_bot) {
                return;
            } // Игнорируем бота

            setSubmitError(null);

            ChatRealtimeService.destroy();

            // Если имя не введено, берем часть email до @ в качестве дефолта
            const displayName =
                value.display_name.trim() || value.email.split("@")[0];

            // 1. Регистрация (Email + Password + Display Name + anti-bot meta)
            const regResult = await AuthService.register(
                value.email,
                value.password,
                {
                    display_name: displayName,
                    _startTime: value._startTime,
                    username_bot: value.username_bot,
                },
            );

            if (regResult.isOk()) {
                // 2. Запрос верификации email (подстраховка — PB может не отправить автоматически)
                AuthService.requestVerification(value.email).then(
                    (verifyResult) => {
                        if (verifyResult.isErr()) {
                            logger.warn(
                                "Не удалось запросить верификацию email",
                                verifyResult.error,
                            );
                        } else {
                            logger.info(
                                "Письмо верификации отправлено",
                                value.email,
                            );
                        }
                    },
                );

                // 3. Автоматический вход для получения токена
                // Без anti-bot meta — PocketBase не принимает лишние params в authWithPassword
                const loginResult = await AuthService.loginWithPassword(
                    value.email,
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
