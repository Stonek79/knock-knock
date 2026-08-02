/**
 * Баннер приватности для эфемерных чатов.
 * Показывает предупреждение о том, что чат зашифрован и будет удалён.
 */

import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Text } from "@/components/ui/Text";
import styles from "./privacy-banner.module.css";

export function PrivacyBanner() {
    const { t } = useTranslation();

    return (
        <Box className={styles.privacyBanner}>
            <Text as="span" className={styles.privacyText}>
                🔒{" "}
                {t(
                    "chat.privacyWarning",
                    "Этот чат зашифрован и будет удален после закрытия",
                )}
            </Text>
        </Box>
    );
}
