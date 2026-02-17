import { Box, Flex, Skeleton, Text } from "@radix-ui/themes";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FavoritesChatList } from "@/features/chat/ChatList/FavoritesChatList";
import { ChatRoom } from "@/features/chat/ChatRoom";
import { useFavoritesRoom } from "@/features/favorites/hooks/useFavoritesRoom";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import styles from "./favoritespage.module.css";

/**
 * Страница избранного.
 * Автоматически открывает (или создает) чат с самим собой, если roomId не указан.
 */
export function FavoritesPage() {
    const { t } = useTranslation();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);
    const { roomId: paramRoomId } = useParams({ strict: false }) as {
        roomId?: string;
    };
    const { data: selfRoomId, isLoading, error } = useFavoritesRoom();

    const roomId = paramRoomId || selfRoomId;

    // На мобильном: если нет выбранной комнаты (paramRoomId), показываем список
    if (isMobile && !paramRoomId) {
        return (
            <Box className={styles.container}>
                <FavoritesChatList />
            </Box>
        );
    }

    // Рендерим комнату чата
    return (
        <Box className={styles.container}>
            {isLoading && !roomId ? (
                <Flex direction="column" height="100%">
                    <Flex direction="column" p="4" gap="4">
                        <Flex gap="3" align="end">
                            <Skeleton width="40px" height="40px" />
                            <Skeleton width="200px" height="60px" />
                        </Flex>
                        <Flex gap="3" align="end" justify="end">
                            <Skeleton width="150px" height="40px" />
                        </Flex>
                        <Flex gap="3" align="end">
                            <Skeleton width="40px" height="40px" />
                            <Skeleton width="250px" height="100px" />
                        </Flex>
                    </Flex>
                </Flex>
            ) : error ? (
                <Flex
                    align="center"
                    justify="center"
                    flexGrow="1"
                    direction="column"
                    gap="2"
                >
                    <Text color="red">
                        {t("common.error", "Ошибка")}:{" "}
                        {getAuthErrorMessage(error)}
                    </Text>
                </Flex>
            ) : roomId ? (
                <ChatRoom roomId={roomId} />
            ) : null}
        </Box>
    );
}
