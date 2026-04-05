import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { usePushSubscription } from "../hooks/usePushSubscription";
import styles from "./notificationsettings.module.css";

export function NotificationSettings() {
    const { t } = useTranslation();
    const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } =
        usePushSubscription();

    const handleToggle = async (checked: boolean | "indeterminate") => {
        if (checked === true) {
            await subscribe();
        } else {
            await unsubscribe();
        }
    };

    return (
        <Box className={styles.container}>
            <Flex direction="column" gap="4" px="4" py="4">
                <Card className={styles.card}>
                    <Flex direction="column" gap="4">
                        <Box className={styles.header}>
                            <label
                                htmlFor="push-toggle"
                                className={styles.label}
                            >
                                {t(
                                    "settings.notifications.pushToggle",
                                    "Web Push уведомления",
                                )}
                            </label>
                            {isSupported ? (
                                <Checkbox
                                    id="push-toggle"
                                    checked={isSubscribed}
                                    disabled={isLoading}
                                    onCheckedChange={handleToggle}
                                    className={styles.checkbox}
                                />
                            ) : (
                                <span className={styles.unsupported}>
                                    {t(
                                        "settings.notifications.unsupported",
                                        "Не поддерживается браузером",
                                    )}
                                </span>
                            )}
                        </Box>

                        <p className={styles.description}>
                            {t(
                                "settings.notifications.pushDesc",
                                "Получайте уведомления о новых сообщениях, даже когда приложение закрыто. Полностью безопасно: мы используем E2E шифрование.",
                            )}
                        </p>
                    </Flex>
                </Card>
            </Flex>
        </Box>
    );
}
