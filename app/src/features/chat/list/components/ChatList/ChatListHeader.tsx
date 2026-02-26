import { Lock, MessageSquarePlus, Plus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { IconButton } from "@/components/ui/IconButton";
import { CHAT_TYPE, FULL_APP_NAME } from "@/lib/constants";
import type { ChatType } from "@/lib/types";
import { ICON_SIZE } from "@/lib/utils/iconSize";
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
            <span className={styles.appTitle}>{title || FULL_APP_NAME}</span>
            {!hideActions && onOpenChatDialog && onOpenGroupDialog && (
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <IconButton
                            variant="ghost"
                            size="md"
                            shape="round"
                            className={styles.createButton}
                            aria-label={t("chat.create", "Создать")}
                        >
                            <Plus size={ICON_SIZE.sm} />
                        </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                        <DropdownMenu.Item
                            onSelect={() => onOpenChatDialog(CHAT_TYPE.PUBLIC)}
                        >
                            <Flex align="center" gap="2">
                                <MessageSquarePlus size={ICON_SIZE.sm} />
                                {t("chat.newChat")}
                            </Flex>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item
                            onSelect={() => onOpenChatDialog(CHAT_TYPE.PRIVATE)}
                        >
                            <Flex align="center" gap="2">
                                <Lock size={ICON_SIZE.sm} />
                                {t("chat.newPrivate")}
                            </Flex>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item onSelect={onOpenGroupDialog}>
                            <Flex align="center" gap="2">
                                <Users size={ICON_SIZE.sm} />
                                {t("chat.newGroup")}
                            </Flex>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            )}
        </header>
    );
}
