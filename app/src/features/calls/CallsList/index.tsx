import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { SidebarHeader } from "../../navigation/components/SidebarHeader";
import styles from "./callslist.module.css";

/**
 * Список звонков (заглушка).
 */
export function CallsList() {
    const { t } = useTranslation();

    return (
        <Box>
            <SidebarHeader title={t("calls.title", "Звонки")} />
            <Box p="4">
                <span className={styles.emptyText}>
                    {t("calls.empty", "История звонков пуста")}
                </span>
            </Box>
        </Box>
    );
}
