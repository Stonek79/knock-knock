import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import styles from "./unread-divider.module.css";

/**
 * Разделитель непрочитанных сообщений.
 */
export function UnreadDivider() {
    const { t } = useTranslation();

    return (
        <Box className={styles.container}>
            <Box className={styles.line} />
            <span className={styles.text}>
                {t("chat.unreadMessages", "Непрочитанные сообщения")}
            </span>
            <Box className={styles.line} />
        </Box>
    );
}
