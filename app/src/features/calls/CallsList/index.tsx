import { Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import styles from "./callslist.module.css";

/**
 * Список звонков (заглушка).
 */
export function CallsList() {
    const { t } = useTranslation();

    return (
        <Box>
            <Flex align="center" gap="2" className={styles.header}>
                <Phone className={styles.icon} />
                {/* Нативный h2 вместо Radix Heading */}
                <h2 className={styles.title}>{t("calls.title", "Звонки")}</h2>
            </Flex>
            <Box p="4">
                {/* Нативный span вместо Radix Text */}
                <span className={styles.emptyText}>
                    {t("calls.empty", "История звонков пуста")}
                </span>
            </Box>
        </Box>
    );
}
