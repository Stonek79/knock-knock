import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Card } from "@/components/ui/Card";
import styles from "./notificationsettings.module.css";

/**
 * Страница настроек уведомлений.
 */
export function NotificationSettings() {
    const { t } = useTranslation();

    return (
        <Box className={styles.container}>
            <Flex direction="column" gap="4" px="4" py="4">
                <Card className={styles.card}>
                    <span className={styles.comingSoon}>
                        {/* Используем новый путь к локализации */}
                        {t(
                            "settings.notifications.comingSoon",
                            "Настройки уведомлений появятся скоро",
                        )}
                    </span>
                </Card>
            </Flex>
        </Box>
    );
}
