import { Flex, Text } from "@radix-ui/themes";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsHeader } from "@/features/settings/SettingsHeader";

export function PrivacySettings() {
    const { t } = useTranslation();

    return (
        <Flex direction="column" gap="4">
            <SettingsHeader
                title="Конфиденциальность"
                titleKey="settings.privacy"
            >
                <Lock size={20} />
            </SettingsHeader>
            <Flex direction="column" gap="4" px="4" pb="4">
                <Text color="gray">
                    {t(
                        "common.soon",
                        "Настройки конфиденциальности появятся скоро",
                    )}
                </Text>
            </Flex>
        </Flex>
    );
}
