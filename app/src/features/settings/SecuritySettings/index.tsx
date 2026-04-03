import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
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
    const user = useAuthStore((state) => state.profile);
    const { areKeysPublished } = useProfileKeys(user?.id);
    const backupProps = useKeysBackup();

    return (
        <Box className={styles.container}>
            <Flex direction="column" gap="4" px="4" pb="4" pt="4">
                <KeysStatusCard areKeysPublished={areKeysPublished} />
                <BackupControls {...backupProps} />
            </Flex>
        </Box>
    );
}
