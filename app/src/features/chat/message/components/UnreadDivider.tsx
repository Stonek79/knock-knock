import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Text } from "@/components/ui/Text";
import styles from "./unread-divider.module.css";

/**
 * Разделитель непрочитанных сообщений.
 */
export function UnreadDivider() {
    const { t } = useTranslation();

    return (
        <Box className={styles.container} data-unread-divider>
            <Box className={styles.line} />
            <Text className={styles.text}>
                {t("chat.unreadMessages", "Непрочитанные сообщения")}
            </Text>
            <Box className={styles.line} />
        </Box>
    );
}
