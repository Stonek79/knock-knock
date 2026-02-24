import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import styles from "./callslist.module.css";

/**
 * Список звонков (заглушка).
 */
export function CallsList() {
    const { t } = useTranslation();

    return (
        <Box>
            <header className={styles.header}>
                <h2 className={styles.title}>{t("calls.title", "Звонки")}</h2>
            </header>
            <Box p="4">
                <span className={styles.emptyText}>
                    {t("calls.empty", "История звонков пуста")}
                </span>
            </Box>
        </Box>
    );
}
