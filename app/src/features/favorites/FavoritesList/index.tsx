/**
 * Компонент "Избранное" (Saved Messages).
 *
 * Реализует паттерн "чат с самим собой" для сохранения заметок,
 * ссылок и важных сообщений. При открытии автоматически создаёт
 * или находит существующий self-chat и перенаправляет в него.
 */
import { Box, Flex, Text } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { RoomService } from "@/lib/services/room";
import { useAuthStore } from "@/stores/auth";
import styles from "./favoriteslist.module.css";

/**
 * Компонент Избранного.
 * При монтировании ищет/создаёт self-chat и перенаправляет в ChatRoom.
 */
export function FavoritesList() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    /**
     * Открывает или создаёт чат с самим собой (Saved Messages).
     * Использует RoomService.findOrCreateDM с targetUserId === currentUserId.
     */
    const openSavedMessages = useCallback(async () => {
        // На мобильных устройствах FavoritesPage сам рендерит чат,
        // поэтому здесь навигация не нужна (и может конфликтовать).
        if (!user || isMobile) {
            setLoading(false);
            return;
        }

        try {
            const result = await RoomService.findOrCreateDM(
                user.id,
                user.id,
                false,
            );

            if (result.isOk()) {
                // Перенаправляем в чат комнату
                navigate({
                    to: "/chat/$roomId",
                    params: { roomId: result.value },
                });
            } else {
                toast({
                    title: t(
                        "favorites.createError",
                        "Не удалось открыть избранное",
                    ),
                    variant: "error",
                });
                setLoading(false);
            }
        } catch {
            toast({
                title: t(
                    "favorites.createError",
                    "Не удалось открыть избранное",
                ),
                variant: "error",
            });
            setLoading(false);
        }
    }, [user, navigate, toast, t, isMobile]);

    useEffect(() => {
        openSavedMessages();
    }, [openSavedMessages]);

    // Показываем индикатор загрузки пока ищем/создаём чат
    if (loading) {
        return (
            <Box className={styles.container}>
                <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    gap="3"
                    className={styles.loadingState}
                >
                    <Loader2 size={24} className={styles.spinner} />
                    <Text color="gray" size="2">
                        {t("favorites.loading", "Открываем избранное...")}
                    </Text>
                </Flex>
            </Box>
        );
    }

    // Fallback если не удалось перенаправить
    return (
        <Box className={styles.container}>
            <Flex
                direction="column"
                align="center"
                justify="center"
                gap="3"
                className={styles.loadingState}
            >
                <Star size={32} className={styles.icon} />
                <Text color="gray" size="2">
                    {t("favorites.empty", "Список избранного пуст")}
                </Text>
            </Flex>
        </Box>
    );
}
