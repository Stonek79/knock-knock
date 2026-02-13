import { Box, Heading } from "@radix-ui/themes";
import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth";
import { BackupControls } from "./components/BackupControls";
import { KeysStatusCard } from "./components/KeysStatusCard";
import { useKeysBackup } from "./hooks/useKeysBackup";
import { useProfileKeys } from "./hooks/useProfileKeys";
import styles from "./security.module.css";

/**
 * Компонент настроек безопасности профиля.
 * Управление резервным копированием ключей шифрования.
 */
export function SecuritySettings() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { areKeysPublished } = useProfileKeys(user?.id);
    const backupProps = useKeysBackup();

    return (
        <Box className={styles.container}>
            <Box p="4" className={styles.name}>
                <Shield className="h-4 w-4" />
                <Heading size="4">{t("profile.securityTitle")}</Heading>
            </Box>

            <Box>
                {/* Индикатор статуса ключей */}
                <Box mb="4">
                    <KeysStatusCard areKeysPublished={areKeysPublished} />
                </Box>

                {/* Управление бэкапом */}
                <BackupControls {...backupProps} />
            </Box>
        </Box>
    );
}
