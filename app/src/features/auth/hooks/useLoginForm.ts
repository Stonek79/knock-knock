import { useForm } from "@tanstack/react-form";
import { type MouseEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuthErrorMessage } from "@/features/auth/utils/auth-error-mapping";
import { useRateLimiter } from "@/hooks/useRateLimiter";
import { AUTH_VIEW_MODES } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { loginSchema } from "@/lib/schemas/auth";
import { AuthService } from "@/lib/services/auth";
import type { AuthViewMode } from "@/lib/types";

/**
 * Хук для управления логикой формы входа/регистрации.
 * Изолирован от PocketBase SDK через AuthService.
 */
export function useLoginForm(onSuccess: () => void) {
    const { t } = useTranslation();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<AuthViewMode>(
        AUTH_VIEW_MODES.LOGIN,
    );

    const { isBlocked, secondsLeft, recordAttempt, resetAttempts } =
        useRateLimiter({
            maxAttempts: 5,
            blockDurationSeconds: 60,
        });

    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
        onSubmit: async ({ value }) => {
            setSubmitError(null);

            if (isBlocked) {
                setSubmitError(
                    t("auth.errors.rateLimitError", { seconds: secondsLeft }),
                );
                return;
            }

            try {
                const isRegister = viewMode === AUTH_VIEW_MODES.REGISTER;

                if (isRegister) {
                    // Регистрация нового пользователя
                    logger.info("Попытка регистрации", { email: value.email });
                    const regResult = await AuthService.register(
                        value.email,
                        value.password,
                    );
                    if (regResult.isErr()) {
                        throw regResult.error;
                    }

                    // После создания — сразу логиним
                    const loginRes = await AuthService.loginWithPassword(
                        value.email,
                        value.password,
                    );
                    if (loginRes.isErr()) {
                        throw loginRes.error;
                    }

                    logger.info("Регистрация успешна");
                    resetAttempts();
                    onSuccess();
                } else {
                    // Вход по email + пароль
                    logger.info("Попытка входа по паролю", {
                        email: value.email,
                    });
                    const loginRes = await AuthService.loginWithPassword(
                        value.email,
                        value.password,
                    );
                    if (loginRes.isErr()) {
                        throw loginRes.error;
                    }

                    logger.info("Вход по паролю успешен");
                    resetAttempts();
                    onSuccess();
                }
            } catch (err) {
                const errorMessage = getAuthErrorMessage(err);
                logger.error("Ошибка при входе", err);
                recordAttempt();
                setSubmitError(t(errorMessage));
            }
        },
    });

    const toggleViewMode = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setViewMode((prev) =>
            prev === AUTH_VIEW_MODES.LOGIN
                ? AUTH_VIEW_MODES.REGISTER
                : AUTH_VIEW_MODES.LOGIN,
        );
        setSubmitError(null);
    };

    return {
        form,
        submitError,
        viewMode,
        toggleViewMode,
        loginSchema,
    };
}
