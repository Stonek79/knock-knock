import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import styles from "./privacysettings.module.css";

/**
 * Страница настроек конфиденциальности (заглушка).
 */
export function PrivacySettings() {
    const { t } = useTranslation();

    return (
        <Flex direction="column" gap="4">
            <Flex direction="column" gap="4" px="4" pb="4" pt="4">
                <span className={styles.comingSoon}>
                    {t(
                        "common.soon",
                        "Настройки конфиденциальности появятся скоро",
                    )}
                </span>
            </Flex>
        </Flex>
    );
}
