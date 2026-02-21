/**
 * Баннер приватности для эфемерных чатов.
 * Показывает предупреждение о том, что чат зашифрован и будет удалён.
 */

import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import styles from "../chatroom.module.css";

export function PrivacyBanner() {
    const { t } = useTranslation();

    return (
        <Box className={styles.privacyBanner}>
            {/* Нативный span вместо Radix Text */}
            <span className={styles.privacyText}>
                🔒{" "}
                {t(
                    "chat.privacyWarning",
                    "Этот чат зашифрован и будет удален после закрытия",
                )}
            </span>
        </Box>
    );
}
