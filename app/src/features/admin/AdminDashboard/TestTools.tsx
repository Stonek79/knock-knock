import { MessageSquarePlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { CHAT_TYPE } from "@/lib/constants";
import { useChatDialogs } from "@/stores/ui/chatDialogs";

export function TestTools() {
    const { t } = useTranslation();
    const { setOpenDialog } = useChatDialogs();

    return (
        <Card>
            <Flex direction="column" gap="4">
                <Text weight="bold" size="lg">
                    {t("admin.testToolsTitle", "Test Data Tools (Production)")}
                </Text>
                <Text intent="secondary" size="md">
                    {t(
                        "admin.testToolsDesc",
                        "Use these tools to quickly create chats and groups for testing purposes. Note: You act as the creator/admin of these rooms.",
                    )}
                </Text>

                <Flex gap="3" wrap="wrap">
                    <Button onClick={() => setOpenDialog(CHAT_TYPE.GROUP)}>
                        <Users />{" "}
                        {t("admin.createTestGroup", "Create Test Group")}
                    </Button>
                    <Button
                        variant="soft"
                        onClick={() => setOpenDialog(CHAT_TYPE.PUBLIC)}
                    >
                        <MessageSquarePlus />{" "}
                        {t("admin.createPublicChat", "Create Public Chat")}
                    </Button>
                    <Button
                        variant="soft"
                        onClick={() => setOpenDialog(CHAT_TYPE.PRIVATE)}
                    >
                        <MessageSquarePlus />{" "}
                        {t("admin.createPrivateChat", "Create Private Chat")}
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
