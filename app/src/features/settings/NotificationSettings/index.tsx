import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import styles from "./notificationsettings.module.css";

/**
 * Страница настроек уведомлений (заглушка).
 */
export function NotificationSettings() {
    const { t } = useTranslation();

    return (
        <Flex direction="column" gap="4">
            <Flex direction="column" gap="4" px="4" pb="4" pt="4">
                {/* Нативный span вместо Radix Text */}
                <span className={styles.comingSoon}>
                    {t("common.soon", "Настройки уведомлений появятся скоро")}
                </span>
            </Flex>
        </Flex>
    );
}
