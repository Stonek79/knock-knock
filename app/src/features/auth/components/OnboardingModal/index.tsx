import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { ROUTES } from "@/lib/constants";
import { AuthService } from "@/lib/services/auth";
import { useAuthStore } from "@/stores/auth";
import styles from "./onboarding.module.css";

/**
 * OnboardingModal - Приветственное окно для новых пользователей.
 * Позволяет установить начальные данные профиля (имя, юзернейм).
 */
export function OnboardingModal() {
    const { t } = useTranslation();
    const profile = useAuthStore((state) => state.profile);
    const fetchProfile = useAuthStore((state) => state.fetchProfile);

    const [displayName, setDisplayName] = useState(profile?.display_name || "");
    const [username, setUsername] = useState(profile?.username || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Модалка открыта, если профиль есть, но онбординг не пройден
    const [open, setOpen] = useState(
        !!profile && !profile.settings?.onboarding_shown,
    );

    /**
     * Обработчик открытия/закрытия.
     * Запрещаем закрытие до завершения онбординга.
     */
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && !profile?.settings?.onboarding_shown) {
            return;
        }
        setOpen(newOpen);
    };

    /**
     * Обработчик завершения онбординга.
     */
    const handleComplete = async () => {
        if (!profile) {
            return;
        }

        setIsSubmitting(true);
        try {
            // Обновляем профиль: ставим имя, юзернейм и флаг завершения онбординга
            const result = await AuthService.updateMe({
                display_name: displayName || profile.display_name,
                username: username || profile.username,
                settings: {
                    ...profile.settings,
                    onboarding_shown: true,
                },
            });

            if (result.isOk()) {
                await fetchProfile();
                setOpen(false);
            }
        } catch (error) {
            console.error("Ошибка при завершении онбординга:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!profile) {
        return null;
    }

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Content className={styles.container}>
                <Dialog.Title className={styles.title}>
                    {t("auth.welcomeTitle")}
                </Dialog.Title>
                <Dialog.Description className={styles.description}>
                    {t("auth.welcomeDesc")}
                </Dialog.Description>

                <Flex direction="column" gap="4" className={styles.form}>
                    <Flex direction="column" gap="2">
                        <label htmlFor="display_name" className={styles.label}>
                            {t("profile.displayName")}
                        </label>
                        <TextField
                            id="display_name"
                            placeholder={t("profile.namePlaceholder")}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                    </Flex>

                    <Flex direction="column" gap="2">
                        <label htmlFor="username" className={styles.label}>
                            {t("profile.username")}
                        </label>
                        <TextField
                            id="username"
                            placeholder="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </Flex>
                </Flex>

                <Link
                    to={ROUTES.TERMS}
                    className={styles.termsLink}
                    target="_blank"
                >
                    {t("auth.iAgreeToTerms")}
                </Link>

                <div className={styles.footer}>
                    <Button
                        variant="solid"
                        onClick={handleComplete}
                        disabled={isSubmitting || !displayName.trim()}
                    >
                        {isSubmitting
                            ? t("common.saving")
                            : t("auth.onboardingComplete")}
                    </Button>
                </div>
            </Dialog.Content>
        </Dialog.Root>
    );
}
