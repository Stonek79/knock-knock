import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Skeleton } from "@/components/ui/Skeleton";
import { getAuthErrorMessage } from "@/features/auth/utils/auth-errors";
import { FavoritesChatList } from "@/features/chat/ChatList/FavoritesChatList";
import { ChatRoom } from "@/features/chat/ChatRoom";
import { useFavoritesRoom } from "@/features/favorites/hooks/useFavoritesRoom";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
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
                            <Skeleton className={styles.skeletonAvatar} />
                            <Skeleton className={styles.skeletonTextMedium} />
                        </Flex>
                        <Flex gap="3" align="end" justify="end">
                            <Skeleton className={styles.skeletonTextShort} />
                        </Flex>
                        <Flex gap="3" align="end">
                            <Skeleton className={styles.skeletonAvatar} />
                            <Skeleton className={styles.skeletonTextLong} />
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
                    <span className={styles.errorText}>
                        {t("common.error", "Ошибка")}:{" "}
                        {getAuthErrorMessage(error)}
                    </span>
                </Flex>
            ) : roomId ? (
                <ChatRoom roomId={roomId} />
            ) : null}
        </Box>
    );
}
