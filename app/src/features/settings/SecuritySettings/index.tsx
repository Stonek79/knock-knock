import { Shield } from "lucide-react";
import { Flex } from "@/components/layout/Flex";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
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
            {/* Единый заголовок с кнопкой «Назад» на мобильном */}
            <SettingsHeader
                title="Безопасность"
                titleKey="profile.securityTitle"
            >
                <Shield size="var(--size-icon-sm)" />
            </SettingsHeader>

            {/* Контент с отступами */}
            <Flex direction="column" gap="4" px="4" pb="4">
                {/* Индикатор статуса ключей */}
                <KeysStatusCard areKeysPublished={areKeysPublished} />

                {/* Управление бэкапом */}
                <BackupControls {...backupProps} />
            </Flex>
        </Flex>
    );
}
