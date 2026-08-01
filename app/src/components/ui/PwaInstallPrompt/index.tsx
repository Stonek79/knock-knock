import { Plus, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_NAME } from "@/lib/constants/common";
import { IconButton } from "../IconButton";
import { Text } from "../Text";
import styles from "./styles.module.css";

export function PwaInstallPrompt() {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Проверяем, закрывал ли пользователь подсказку
        const dismissed = localStorage.getItem("pwa_prompt_dismissed");
        if (dismissed === "true") {
            return;
        }

        // Проверяем устройство (iOS)
        const isIos =
            /iPad|iPhone|iPod/.test(navigator.userAgent) &&
            !("MSStream" in window);

        // Проверяем, запущено ли приложение в режиме PWA (standalone)
        const nav = navigator as unknown as { standalone?: boolean };
        const isStandalone =
            nav.standalone === true ||
            window.matchMedia("(display-mode: standalone)").matches;

        if (isIos && !isStandalone) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem("pwa_prompt_dismissed", "true");
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.promptCard}>
                <div className={styles.header}>
                    <Text size="md" weight="bold">
                        {t("common.pwa.installTitle")}
                    </Text>
                    <IconButton
                        onClick={handleDismiss}
                        variant="ghost"
                        size="sm"
                        aria-label={t("common.close")}
                    >
                        <X width={16} height={16} />
                    </IconButton>
                </div>
                <div className={styles.content}>
                    <Text size="sm" intent="secondary">
                        {t("common.pwa.installDesc", { appName: APP_NAME })}
                    </Text>
                    <div className={styles.instructions}>
                        <div className={styles.step}>
                            <Text size="sm">{t("common.pwa.step1")}</Text>
                            <Share className={styles.icon} />
                        </div>
                        <div className={styles.step}>
                            <Text size="sm">{t("common.pwa.step2")}</Text>
                            <div className={styles.badge}>
                                <Plus width={12} height={12} />{" "}
                                {t("common.pwa.addToHome")}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
