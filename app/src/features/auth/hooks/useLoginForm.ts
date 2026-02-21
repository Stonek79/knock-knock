import { useForm } from "@tanstack/react-form";
import { type MouseEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuthErrorMessage } from "@/features/auth/utils/auth-errors";
import { useRateLimiter } from "@/hooks/useRateLimiter";
import { AUTH_MODES, AUTH_VIEW_MODES } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { loginSchema } from "@/lib/schemas/auth";
import { supabase } from "@/lib/supabase";
import type { AuthMode, AuthViewMode } from "@/lib/types/auth";

/**
 * Хук для управления логикой формы входа/регистрации.
 */
export function useLoginForm(onSuccess: () => void) {
    const { t } = useTranslation();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [authMode, setAuthMode] = useState<AuthMode>(AUTH_MODES.MAGIC_LINK);
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
                if (authMode === AUTH_MODES.MAGIC_LINK) {
                    logger.info("Attempting magic link login", {
                        email: value.email,
                        type: viewMode,
                    });
                    const { error } = await supabase.auth.signInWithOtp({
                        email: value.email,
                        options: {
                            emailRedirectTo: window.location.origin,
                        },
                    });

                    if (error) {
                        throw error;
                    }

                    logger.info("Magic link sent successfully");
                    resetAttempts();
                    onSuccess();
                } else {
                    const isRegister = viewMode === AUTH_VIEW_MODES.REGISTER;

                    if (isRegister) {
                        const { error } = await supabase.auth.signUp({
                            email: value.email,
                            password: value.password || "",
                        });
                        if (error) {
                            throw error;
                        }
                        logger.info("Password registration successful");
                        // Обычно требует подтверждения почты, но пока считаем успехом
                        resetAttempts();
                        onSuccess();
                    } else {
                        const { error } =
                            await supabase.auth.signInWithPassword({
                                email: value.email,
                                password: value.password || "",
                            });
                        if (error) {
                            throw error;
                        }
                        logger.info("Password login successful");
                        resetAttempts();
                    }
                }
            } catch (err) {
                logger.error("Login exception", err);
                recordAttempt();
                setSubmitError(getAuthErrorMessage(err));
            }
        },
    });

    const toggleAuthMode = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setAuthMode((prev) =>
            prev === AUTH_MODES.MAGIC_LINK
                ? AUTH_MODES.PASSWORD
                : AUTH_MODES.MAGIC_LINK,
        );
        setSubmitError(null);
    };

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
        authMode,
        viewMode,
        toggleAuthMode,
        toggleViewMode,
        loginSchema,
    };
}
