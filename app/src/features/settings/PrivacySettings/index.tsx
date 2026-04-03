import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Card } from "@/components/ui/Card";
import styles from "./privacysettings.module.css";

/**
 * Страница настроек конфиденциальности.
 */
export function PrivacySettings() {
    const { t } = useTranslation();

    return (
        <Box className={styles.container}>
            <Flex direction="column" gap="4" px="4" py="4">
                <Card className={styles.card}>
                    <span className={styles.comingSoon}>
                        {t(
                            "settings.privacy.comingSoon",
                            "Настройки конфиденциальности появятся скоро",
                        )}
                    </span>
                </Card>
            </Flex>
        </Box>
    );
}
