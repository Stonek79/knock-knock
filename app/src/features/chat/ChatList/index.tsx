import { Box, Flex, ScrollArea, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "@/components/Search/Search";
import { CreateChatDialog } from "@/features/chat/CreateChatDialog";
import { CreateGroupDialog } from "@/features/chat/CreateGroupDialog";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { CHAT_TYPE } from "@/lib/constants";
import type { ChatType } from "@/lib/types";
import { useChatList } from "../hooks/useChatList";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { ChatListHeader } from "./ChatListHeader";
import { ChatListItem } from "./ChatListItem";
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
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    const [openDialog, setOpenDialog] = useState<ChatDialogType>(null);
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const { data: chats = [], isLoading } = useChatList();
    const { getCount } = useUnreadCounts();

    /**
     * Обработчик изменения состояния диалога.
     */
    const handleDialogChange = (open: boolean) => {
        if (!open) {
            setOpenDialog(null);
        }
    };

    /**
     * Обработчик открытия диалога создания чата.
     */
    const handleOpenChatDialog = (type: ChatType) => {
        setOpenDialog(type);
    };

    /**
     * Обработчик открытия диалога создания группы.
     */
    const handleOpenGroupDialog = () => {
        setIsGroupDialogOpen(true);
    };

    // Состояние загрузки
    if (isLoading) {
        return (
            <Box className={styles.loadingContainer}>
                <Text color="gray" size="2">
                    {t("common.loading")}
                </Text>
            </Box>
        );
    }

    return (
        <>
            <Flex direction="column" className={styles.container}>
                {/* Заголовок с меню (только для десктопа) */}
                {!isMobile && (
                    <>
                        <ChatListHeader
                            onOpenChatDialog={handleOpenChatDialog}
                            onOpenGroupDialog={handleOpenGroupDialog}
                        />
                        <div className={styles.searchWrapper}>
                            <Search
                                value={searchQuery}
                                onChange={setSearchQuery}
                            />
                        </div>
                    </>
                )}

                {/* Пустой список */}
                {chats.length === 0 ? (
                    <Box className={styles.emptyContainer}>
                        <Text color="gray" size="2">
                            {t("chat.noRooms", "У вас пока нет чатов")}
                        </Text>
                    </Box>
                ) : (
                    // Список чатов
                    <ScrollArea type="hover" className={styles.chatList}>
                        <Flex direction="column">
                            {chats.map((chat) => (
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
            </Flex>

            {/* Диалоги рендерятся вне основного контейнера через порталы */}
            <CreateChatDialog
                open={openDialog === CHAT_TYPE.PUBLIC}
                onOpenChange={handleDialogChange}
                isPrivate={false}
            />
            <CreateChatDialog
                open={openDialog === CHAT_TYPE.PRIVATE}
                onOpenChange={handleDialogChange}
                isPrivate
            />
            <CreateGroupDialog
                open={isGroupDialogOpen}
                onOpenChange={setIsGroupDialogOpen}
            />
        </>
    );
}
