import { Box, Flex, ScrollArea } from "@radix-ui/themes";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "@/components/Search/Search";
import { ROUTES } from "@/lib/constants";
import { useFavoritesChatList } from "../hooks/useFavoritesChatList";
import { ChatListHeader } from "./ChatListHeader";
import { ChatListItem } from "./ChatListItem";
import { ChatListLoadingState } from "./ChatListItemSkeleton";
import styles from "./chatlist.module.css";

/**
 * FavoritesChatList - Список избранных чатов для сайдбара.
 * Реализует гибридный подход: Saved Messages сверху + чаты со звездочками.
 */
export function FavoritesChatList() {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const { data: favorites, isLoading } = useFavoritesChatList();

    const filteredFavorites = favorites?.filter((chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
        <Flex direction="column" className={styles.container}>
            {/* Header: Favorites + Search */}
            <Box>
                <ChatListHeader
                    title={t("nav.favorites", "Избранное")}
                    hideActions={true}
                />
                <Box p="3">
                    <Search
                        placeholder={t(
                            "chat.searchPlaceholder",
                            "Поиск в избранном",
                        )}
                        value={searchQuery}
                        onChange={(value: string) => setSearchQuery(value)}
                    />
                </Box>
            </Box>

            {/* Состояние списка: Загрузка / Пусто / Список */}
            {isLoading ? (
                <ChatListLoadingState />
            ) : !filteredFavorites || filteredFavorites.length === 0 ? (
                <Flex
                    align="center"
                    justify="center"
                    p="5"
                    className={styles.muted}
                >
                    {t("chat.noFavorites", "Нет избранных сообщений")}
                </Flex>
            ) : (
                <ScrollArea type="hover" className={styles.chatList}>
                    <Flex direction="column">
                        {filteredFavorites.map((chat) => (
                            <ChatListItem
                                key={chat.id}
                                chat={chat}
                                linkPrefix={ROUTES.FAVORITES}
                            />
                        ))}
                    </Flex>
                </ScrollArea>
            )}
        </Flex>
    );
}
