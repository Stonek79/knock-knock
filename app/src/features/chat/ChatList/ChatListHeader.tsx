import { DropdownMenu, Flex, IconButton, Text } from "@radix-ui/themes";
import { Lock, MessageSquarePlus, Plus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CHAT_TYPE, FULL_APP_NAME } from "@/lib/constants";
import type { ChatType } from "@/lib/types";
import styles from "./chatlist.module.css";

interface ChatListHeaderProps {
    /** Callback открытия диалога создания чата */
    onOpenChatDialog?: (type: ChatType) => void;
    /** Callback открытия диалога создания группы */
    onOpenGroupDialog?: () => void;
    /** Кастомный заголовок */
    title?: string;
    /** Скрыть меню действий */
    hideActions?: boolean;
}

/**
 * Заголовок списка чатов с выпадающим меню создания.
 */
export function ChatListHeader({
    onOpenChatDialog,
    onOpenGroupDialog,
    title,
    hideActions = false,
}: ChatListHeaderProps) {
    const { t } = useTranslation();

    return (
        <header className={styles.header}>
            <Text className={styles.appTitle}>{title || FULL_APP_NAME}</Text>
            {!hideActions && onOpenChatDialog && onOpenGroupDialog && (
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        <IconButton
                            variant="ghost"
                            className={styles.createButton}
                            size="3"
                        >
                            <Plus size={20} />
                        </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content variant="soft">
                        <DropdownMenu.Item
                            onSelect={() => onOpenChatDialog(CHAT_TYPE.PUBLIC)}
                        >
                            <Flex align="center" gap="2">
                                <MessageSquarePlus size={16} />
                                {t("chat.newChat")}
                            </Flex>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item
                            onSelect={() => onOpenChatDialog(CHAT_TYPE.PRIVATE)}
                        >
                            <Flex align="center" gap="2">
                                <Lock size={16} />
                                {t("chat.newPrivate")}
                            </Flex>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item onSelect={onOpenGroupDialog}>
                            <Flex align="center" gap="2">
                                <Users size={16} />
                                {t("chat.newGroup")}
                            </Flex>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            )}
        </header>
    );
}
