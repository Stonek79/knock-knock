import { MessageSquareOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Search } from "@/components/ui/Search";
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
        <div className={styles.container}>
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
                <div>
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
                </div>
            ) : (
                // Список чатов
                <ScrollArea type="hover" className={styles.chatList}>
                    <div>
                        {filteredChats.map((chat) => (
                            <ChatListItem
                                key={chat.id}
                                chat={{
                                    ...chat,
                                    unread: getCount(chat.id),
                                }}
                            />
                        ))}
                    </div>
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
