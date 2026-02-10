import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

export function NotificationSettings() {
    const { t } = useTranslation();

    return (
        <Box p="4">
            <Flex align="center" gap="2" mb="4">
                <Bell size={24} />
                <Heading size="4">
                    {t("settings.notifications", "Уведомления")}
                </Heading>
            </Flex>
            <Text color="gray">
                {t("common.soon", "Настройки уведомлений появятся скоро")}
            </Text>
        </Box>
    );
}
