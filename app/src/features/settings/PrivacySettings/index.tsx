import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./privacysettings.module.css";

/**
 * Страница настроек конфиденциальности (заглушка).
 */
export function PrivacySettings() {
    const { t } = useTranslation();

    return (
        <Flex direction="column" gap="4">
            <SettingsHeader
                title="Конфиденциальность"
                titleKey="settings.privacy"
            >
                <Lock size={ICON_SIZE.sm} />
            </SettingsHeader>
            <Flex direction="column" gap="4" px="4" pb="4">
                {/* Нативный span вместо Radix Text */}
                <span className={styles.comingSoon}>
                    {t(
                        "common.soon",
                        "Настройки конфиденциальности появятся скоро",
                    )}
                </span>
            </Flex>
        </Flex>
    );
}
