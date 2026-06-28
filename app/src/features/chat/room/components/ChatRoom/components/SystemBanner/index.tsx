import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Text } from "@/components/ui/Text";
import styles from "./system-banner.module.css";

export function SystemBanner() {
    const { t } = useTranslation();

    return (
        <Box className={styles.systemBanner}>
            <Text intent="secondary" size="sm">
                📢{" "}
                {t(
                    "chat.systemChannelReadOnly",
                    "Здесь приходят системные сообщения",
                )}
            </Text>
        </Box>
    );
}
