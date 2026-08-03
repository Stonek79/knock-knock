import { Plus, Share, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { APP_NAME } from "@/lib/constants";
import { Button } from "../Button";
import { IconButton } from "../IconButton";
import { Text } from "../Text";
import styles from "./styles.module.css";

export function InstallPromptModal() {
    const { t } = useTranslation();
    const { isVisible, isNativePromptReady, dismissPrompt, installPrompt } =
        useInstallPrompt();

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
                        onClick={dismissPrompt}
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

                    {isNativePromptReady ? (
                        <Box className={styles.instructions}>
                            <Button
                                onClick={installPrompt}
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
