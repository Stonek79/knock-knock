import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Search } from "@/components/ui/Search";
import { ROUTES } from "@/lib/constants";
import { SidebarHeader } from "../../../../navigation/components/SidebarHeader";
import { useFavoritesChatList } from "../../hooks/useFavoritesChatList";
import { ChatListItem } from "../ChatListItem";
import { ChatListLoadingState } from "../ChatListItemSkeleton";
import styles from "./favorites-chatlist.module.css";

/**
 * FavoritesChatList - Список избранных чатов для сайдбара.
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
            <Box>
                <SidebarHeader title={t("nav.favorites", "Избранное")} />
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
