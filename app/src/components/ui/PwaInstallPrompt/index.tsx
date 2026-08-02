import { Plus, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import {
    APP_NAME,
    BROWSER_CONSTANTS,
    PWA_DISPLAY_MODE,
    PWA_EVENTS,
    PWA_PROMPT_OUTCOME,
    STORAGE_CONFIG,
} from "@/lib/constants";
import { Button } from "../Button";
import { IconButton } from "../IconButton";
import { Text } from "../Text";
import styles from "./styles.module.css";

type PwaOutcome = (typeof PWA_PROMPT_OUTCOME)[keyof typeof PWA_PROMPT_OUTCOME];

// Declare interface for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: PwaOutcome;
        platform: string;
    }>;
    prompt(): Promise<void>;
}

declare global {
    interface WindowEventMap {
        [PWA_EVENTS.BEFORE_INSTALL_PROMPT]: BeforeInstallPromptEvent;
    }
}

export function PwaInstallPrompt() {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        // Проверяем, закрывал ли пользователь подсказку
        const dismissed = localStorage.getItem(
            STORAGE_CONFIG.PWA_PROMPT_DISMISSED,
        );
        if (dismissed === "true") {
            return;
        }

        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener(
            PWA_EVENTS.BEFORE_INSTALL_PROMPT,
            handleBeforeInstallPrompt,
        );

        // Проверяем устройство (iOS)
        const isIos =
            /iPad|iPhone|iPod/.test(navigator.userAgent) &&
            !(BROWSER_CONSTANTS.MS_STREAM in window);

        // Проверяем, запущено ли приложение в режиме PWA (standalone)
        const nav = navigator as unknown as { standalone?: boolean };
        const isStandalone =
            nav.standalone === true ||
            window.matchMedia(PWA_DISPLAY_MODE.STANDALONE).matches;

        if (isIos && !isStandalone) {
            setIsVisible(true);
        }

        return () => {
            window.removeEventListener(
                PWA_EVENTS.BEFORE_INSTALL_PROMPT,
                handleBeforeInstallPrompt,
            );
        };
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_CONFIG.PWA_PROMPT_DISMISSED, "true");
        setIsVisible(false);
    };

    const handleInstall = async () => {
        if (!deferredPrompt) {
            return;
        }

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === PWA_PROMPT_OUTCOME.ACCEPTED) {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <Box className={styles.overlay}>
            <Box className={styles.promptCard}>
                <Flex
                    className={styles.header}
                    justify="between"
                    align="center"
                >
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
                </Flex>
                <Box className={styles.content}>
                    <Text size="sm" intent="secondary">
                        {t("common.pwa.installDesc", { appName: APP_NAME })}
                    </Text>

                    {deferredPrompt ? (
                        <Box className={styles.instructions}>
                            <Button
                                onClick={handleInstall}
                                intent="primary"
                                variant="solid"
                                size="md"
                            >
                                {t(
                                    "common.pwa.installApp",
                                    "Установить приложение",
                                )}
                            </Button>
                        </Box>
                    ) : (
                        <Box className={styles.instructions}>
                            <Flex
                                className={styles.step}
                                align="center"
                                gap="2"
                            >
                                <Text size="sm">{t("common.pwa.step1")}</Text>
                                <Share className={styles.icon} />
                            </Flex>
                            <Flex
                                className={styles.step}
                                align="center"
                                gap="2"
                            >
                                <Text size="sm">{t("common.pwa.step2")}</Text>
                                <Flex
                                    className={styles.badge}
                                    align="center"
                                    gap="1"
                                >
                                    <Plus width={12} height={12} />{" "}
                                    {t("common.pwa.addToHome")}
                                </Flex>
                            </Flex>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
