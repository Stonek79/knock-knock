import { Box, Flex, ScrollArea, Text } from "@radix-ui/themes";
import { MessageSquareOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "@/components/Search/Search";
import { CreateChatDialog } from "@/features/chat/CreateChatDialog";
import { CreateGroupDialog } from "@/features/chat/CreateGroupDialog";
import { CHAT_TYPE } from "@/lib/constants";
import type { ChatType } from "@/lib/types";
import { useChatList } from "../hooks/useChatList";
import { useChatListSubscription } from "../hooks/useChatListSubscription";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { ChatListHeader } from "./ChatListHeader";
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
 *
 * Структура компонента:
 * - ChatListHeader: Заголовок с меню создания чатов
 * - ChatListItem: Элемент списка чатов
 * - useChatList: Хук для загрузки данных
 *
 * @returns JSX элемент списка чатов
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

    // Realtime-подписка на новые сообщения и комнаты
    useChatListSubscription();

    return (
        <Flex direction="column" className={styles.container}>
            {/* Header: Knock Knock + Search */}
            <Box>
                <ChatListHeader
                    onOpenChatDialog={(type) => setOpenDialog(type)}
                    onOpenGroupDialog={() => setIsGroupDialogOpen(true)}
                />
                <Box p="3">
                    <Search
                        placeholder={t("chat.searchPlaceholder", "Поиск")}
                        value={searchQuery}
                        onChange={(value) => setSearchQuery(value)}
                    />
                </Box>
            </Box>

            {/* Состояние списка: Загрузка / Пусто / Список */}
            {isLoading ? (
                <ChatListLoadingState />
            ) : filteredChats.length === 0 ? (
                <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    height="100%"
                    p="5"
                    gap="3"
                >
                    <MessageSquareOff size={48} className={styles.emptyIcon} />
                    <Text align="center" size="3" weight="medium">
                        {t("chat.noRooms", "У вас пока нет чатов")}
                    </Text>
                    <Text align="center" size="2" color="gray">
                        {searchQuery
                            ? t(
                                  "chat.noSearchResults",
                                  "По вашему запросу ничего не найдено",
                              )
                            : t(
                                  "chat.startChattingDescription",
                                  "Начните общение, создав новый чат",
                              )}
                    </Text>
                </Flex>
            ) : (
                // Список чатов
                <ScrollArea type="hover" className={styles.chatList}>
                    <Flex direction="column">
                        {filteredChats.map((chat) => (
                            <ChatListItem
                                key={chat.id}
                                chat={{
                                    ...chat,
                                    unread: getCount(chat.id),
                                }}
                            />
                        ))}
                    </Flex>
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
        </Flex>
    );
}
