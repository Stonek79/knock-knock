import { Flex } from "@/components/layout/Flex";
import { useAuthStore } from "@/stores/auth";
import { BackupControls } from "./components/BackupControls";
import { KeysStatusCard } from "./components/KeysStatusCard";
import { useKeysBackup } from "./hooks/useKeysBackup";
import { useProfileKeys } from "./hooks/useProfileKeys";

/**
 * Компонент настроек безопасности профиля.
 * Управление резервным копированием ключей шифрования.
 */
export function SecuritySettings() {
    const { user } = useAuthStore();
    const { areKeysPublished } = useProfileKeys(user?.id);
    const backupProps = useKeysBackup();

    return (
        <Flex direction="column" gap="4">
            <Flex direction="column" gap="4" px="4" pb="4" pt="4">
                <KeysStatusCard areKeysPublished={areKeysPublished} />
                <BackupControls {...backupProps} />
            </Flex>
        </Flex>
    );
}
