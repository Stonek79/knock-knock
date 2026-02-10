/**
 * Баннер приватности для эфемерных чатов.
 * Показывает предупреждение о том, что чат зашифрован и будет удалён.
 */
import { Box, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import styles from "../chat.module.css";

export function PrivacyBanner() {
    const { t } = useTranslation();

    return (
        <Box className={styles.privacyBanner} py="1" px="3">
            <Text size="1" color="orange" weight="medium">
                🔒{" "}
                {t(
                    "chat.privacyWarning",
                    "Этот чат зашифрован и будет удален после закрытия",
                )}
            </Text>
        </Box>
    );
}
