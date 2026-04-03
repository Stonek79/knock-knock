import {
    Lock,
    MessageSquareOff,
    MessageSquarePlus,
    Plus,
    Users,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { IconButton } from "@/components/ui/IconButton";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Search } from "@/components/ui/Search";
import { CHAT_TYPE } from "@/lib/constants";
import type { ChatType } from "@/lib/types";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { SidebarHeader } from "../../../navigation/components/SidebarHeader";
import { CreateChatDialog, CreateGroupDialog } from "../../creation";
import { useChatList } from "../hooks/useChatList";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { ChatListItem } from "./ChatListItem";
import { ChatListLoadingState } from "./ChatListItemSkeleton";
import styles from "./chatlist.module.css";

/**
 * Тип открытого диалога создания чата.
 */
type ChatDialogType = ChatType | null;

/**
 * Компонент списка чатов.
 * Используется как в Sidebar (десктоп), так и как основной контент на мобильных.
 */
export function ChatList() {
    const { t } = useTranslation();

    const [openDialog, setOpenDialog] = useState<ChatDialogType>(null);
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const { data: chats = [], isLoading } = useChatList();
    const { getCount } = useUnreadCounts();

    // Фильтрация чатов по строке поиска
    const filteredChats = chats.filter((chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
        <div className={styles.container}>
            <Box>
                <SidebarHeader title={t("chat.title", "Чаты")}>
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <IconButton
                                variant="ghost"
                                size="md"
                                shape="round"
                                className={styles.createButton}
                                aria-label={t("chat.create", "Создать")}
                                data-testid="plus-button"
                            >
                                <Plus size={ICON_SIZE.sm} />
                            </IconButton>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                            <DropdownMenu.Item
                                onSelect={() => setOpenDialog(CHAT_TYPE.PUBLIC)}
                                data-testid="menu-item-new-chat"
                            >
                                <Flex align="center" gap="2">
                                    <MessageSquarePlus size={ICON_SIZE.sm} />
                                    {t("chat.newChat")}
                                </Flex>
                            </DropdownMenu.Item>

                            <DropdownMenu.Item
                                onSelect={() =>
                                    setOpenDialog(CHAT_TYPE.PRIVATE)
                                }
                            >
                                <Flex align="center" gap="2">
                                    <Lock size={ICON_SIZE.sm} />
                                    {t("chat.newPrivate")}
                                </Flex>
                            </DropdownMenu.Item>

                            <DropdownMenu.Item
                                onSelect={() => setIsGroupDialogOpen(true)}
                            >
                                <Flex align="center" gap="2">
                                    <Users size={ICON_SIZE.sm} />
                                    {t("chat.newGroup")}
                                </Flex>
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator
                                className={styles.adminSeparator}
                            />
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                </SidebarHeader>
                {filteredChats?.length > 0 && (
                    <Box p="3">
                        <Search
                            placeholder={t("chat.searchPlaceholder", "Поиск")}
                            value={searchQuery}
                            onChange={(value) => setSearchQuery(value)}
                        />
                    </Box>
                )}
            </Box>

            {/* Состояние списка: Загрузка / Пусто / Список */}
            {isLoading ? (
                <ChatListLoadingState />
            ) : filteredChats?.length === 0 ? (
                <Flex
                    direction="column"
                    gap="4"
                    px="4"
                    pb="4"
                    pt="4"
                    align="center"
                >
                    <MessageSquareOff className={styles.emptyIcon} />
                    <span className={styles.emptyTitle}>
                        {t("chat.noRooms", "У вас пока нет чатов")}
                    </span>
                    <span className={styles.emptySubtitle}>
                        {searchQuery
                            ? t(
                                  "chat.noSearchResults",
                                  "По вашему запросу ничего не найдено",
                              )
                            : t(
                                  "chat.startChattingDescription",
                                  "Начните общение, создав новый чат",
                              )}
                    </span>
                    <Button
                        onClick={() => setOpenDialog(CHAT_TYPE.PUBLIC)}
                        variant="outline"
                    >
                        {t("chat.createChat", "Создать чат")}
                    </Button>
                    <Button
                        onClick={() => setIsGroupDialogOpen(true)}
                        variant="outline"
                    >
                        {t("chat.createGroup", "Создать группу")}
                    </Button>
                    <Button
                        onClick={() => setOpenDialog(CHAT_TYPE.PRIVATE)}
                        variant="outline"
                    >
                        {t("chat.createPrivateChat", "Создать приватный чат")}
                    </Button>
                </Flex>
            ) : (
                // Список чатов
                <ScrollArea type="hover" className={styles.chatList}>
                    {filteredChats.map((chat) => (
                        <ChatListItem
                            key={chat.id}
                            chat={{
                                ...chat,
                                unread: getCount(chat.id),
                            }}
                        />
                    ))}
                </ScrollArea>
            )}

            {/* Диалоги ... */}
            <CreateChatDialog
                open={openDialog === CHAT_TYPE.PUBLIC}
                onOpenChange={(open) => !open && setOpenDialog(null)}
                isPrivate={false}
            />
            <CreateChatDialog
                open={openDialog === CHAT_TYPE.PRIVATE}
                onOpenChange={(open) => !open && setOpenDialog(null)}
                isPrivate
            />
            <CreateGroupDialog
                open={isGroupDialogOpen}
                onOpenChange={setIsGroupDialogOpen}
            />
        </div>
    );
}
