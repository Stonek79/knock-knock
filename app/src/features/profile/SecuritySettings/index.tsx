import { Box, Heading, Separator } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth";
import { BackupControls } from "../components/BackupControls";
import { KeysStatusCard } from "../components/KeysStatusCard";
import { useKeysBackup } from "../hooks/useKeysBackup";
import { useProfileKeys } from "../hooks/useProfileKeys";

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
        <Box mt="8" pt="4">
            <Separator size="4" mb="6" />

            <Heading size="4" mb="4">
                {t("profile.securityTitle")}
            </Heading>

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
