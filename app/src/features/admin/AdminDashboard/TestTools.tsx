import { MessageSquarePlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { useTestTools } from "@/features/admin/hooks/useTestTools";
import { CreateChatDialog } from "@/features/chat/CreateChatDialog";
import { CreateGroupDialog } from "@/features/chat/CreateGroupDialog";
import { CHAT_TYPE } from "@/lib/constants";

export function TestTools() {
    const { t } = useTranslation();
    const {
        isGroupOpen,
        setIsGroupOpen,
        isChatOpen,
        setIsChatOpen,
        chatType,
        openCreateChat,
    } = useTestTools();

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
                    <Button onClick={() => setIsGroupOpen(true)}>
                        <Users />{" "}
                        {t("admin.createTestGroup", "Create Test Group")}
                    </Button>
                    <Button
                        variant="soft"
                        onClick={() => openCreateChat(CHAT_TYPE.PUBLIC)}
                    >
                        <MessageSquarePlus />{" "}
                        {t("admin.createPublicChat", "Create Public Chat")}
                    </Button>
                    <Button
                        variant="soft"
                        onClick={() => openCreateChat(CHAT_TYPE.PRIVATE)}
                    >
                        <MessageSquarePlus />{" "}
                        {t("admin.createPrivateChat", "Create Private Chat")}
                    </Button>
                </Flex>

                {/* Dialogs */}
                <CreateGroupDialog
                    open={isGroupOpen}
                    onOpenChange={setIsGroupOpen}
                />

                <CreateChatDialog
                    open={isChatOpen}
                    onOpenChange={setIsChatOpen}
                    isPrivate={chatType === CHAT_TYPE.PRIVATE}
                />
            </Flex>
        </Card>
    );
}
