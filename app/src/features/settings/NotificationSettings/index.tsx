import { Flex, Text } from "@radix-ui/themes";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsHeader } from "@/features/settings/SettingsHeader";

export function NotificationSettings() {
    const { t } = useTranslation();

    return (
        <Flex direction="column" gap="4">
            <SettingsHeader
                title="Уведомления"
                titleKey="settings.notifications"
            >
                <Bell size={20} />
            </SettingsHeader>
            <Flex direction="column" gap="4" px="4" pb="4">
                <Text color="gray">
                    {t("common.soon", "Настройки уведомлений появятся скоро")}
                </Text>
            </Flex>
        </Flex>
    );
}
