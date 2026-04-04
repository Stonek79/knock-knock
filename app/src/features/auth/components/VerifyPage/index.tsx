import { useNavigate, useSearch } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { AppLogo } from "@/components/ui/AppLogo";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES, VERIFY_STATUS } from "@/lib/constants";
import { AuthService } from "@/lib/services/auth";
import type { VerifyStatus } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";
import styles from "./verifyPage.module.css";

export function VerifyPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const search = useSearch({ from: ROUTES.VERIFY });
    const token = (search as { token?: string }).token;
    const profile = useAuthStore((state) => state.profile);

    const [status, setStatus] = useState<VerifyStatus>(VERIFY_STATUS.PENDING);

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus(VERIFY_STATUS.ERROR);
                return;
            }

            const result = await AuthService.confirmVerification(token);

            if (result.isOk()) {
                setStatus(VERIFY_STATUS.VERIFIED);
                // Если пользователь авторизован, обновляем его профиль (статус verified)
                if (AuthService.isValid()) {
                    useAuthStore.getState().fetchProfile();
                }
            } else {
                setStatus(VERIFY_STATUS.ERROR);
            }
        };

        verify();
    }, [token]);

    const handleAction = () => {
        if (profile) {
            navigate({ to: ROUTES.CHAT_LIST });
        } else {
            navigate({ to: ROUTES.LOGIN });
        }
    };

    return (
        <main className={styles.page}>
            <div className={styles.background} />

            <Flex
                direction="column"
                align="center"
                justify="center"
                className={styles.container}
            >
                <div className={styles.glassCard}>
                    <Flex direction="column" align="center" gap="4" mb="8">
                        <AppLogo size="lg" />
                    </Flex>

                    <div
                        className={`${styles.iconWrapper} ${status === VERIFY_STATUS.PENDING ? styles.isLoading : ""}`}
                    >
                        {status === VERIFY_STATUS.PENDING && (
                            <Spinner size="lg" />
                        )}
                        {status === VERIFY_STATUS.VERIFIED && (
                            <CheckCircle2
                                size={64}
                                className={styles.successIcon}
                            />
                        )}
                        {status === VERIFY_STATUS.ERROR && (
                            <XCircle size={64} className={styles.errorIcon} />
                        )}
                    </div>

                    <h1 className={styles.title}>
                        {status === VERIFY_STATUS.PENDING &&
                            t("auth.verificationProcessing")}
                        {status === VERIFY_STATUS.VERIFIED &&
                            t("auth.verificationSuccess")}
                        {status === VERIFY_STATUS.ERROR &&
                            t("auth.verificationError")}
                    </h1>

                    <p className={styles.message}>
                        {status === VERIFY_STATUS.PENDING &&
                            t("auth.verificationProcessing")}
                        {status === VERIFY_STATUS.VERIFIED &&
                            (profile
                                ? t("auth.goToChat")
                                : t("auth.backToLogin"))}
                        {status === VERIFY_STATUS.ERROR &&
                            t("auth.verificationError")}
                    </p>

                    {status !== VERIFY_STATUS.PENDING && (
                        <Button
                            className={styles.actionButton}
                            onClick={handleAction}
                            variant="solid"
                        >
                            {status === VERIFY_STATUS.VERIFIED
                                ? profile
                                    ? t("auth.goToChat")
                                    : t("auth.toLogin")
                                : t("auth.backToLogin")}
                        </Button>
                    )}
                </div>

                <footer className={styles.footer}>
                    <p>© {new Date().getFullYear()} Knock-Knock Messenger</p>
                </footer>
            </Flex>
        </main>
    );
}
