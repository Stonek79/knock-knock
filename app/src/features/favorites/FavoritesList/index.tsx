/**
 * Компонент "Избранное" (Saved Messages).
 */

import { useNavigate } from "@tanstack/react-router";
import { Loader2, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { useToast } from "@/components/ui/Toast";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { RoomService } from "@/lib/services/room";
import { ICON_SIZE } from "@/lib/utils/iconSize";
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

    const openSavedMessages = useCallback(async () => {
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
                    description: result.error.message,
                    variant: "error",
                });
                setLoading(false);
            }
        } catch (error: unknown) {
            console.error("Favorites error:", error);
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

            toast({
                title: t(
                    "favorites.createError",
                    "Не удалось открыть избранное",
                ),
                description: errorMessage,
                variant: "error",
            });
            setLoading(false);
        }
    }, [user, navigate, toast, t, isMobile]);

    useEffect(() => {
        openSavedMessages();
    }, [openSavedMessages]);

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
                    <Loader2 size={ICON_SIZE.sm} className={styles.spinner} />
                    {/* Нативный span вместо Radix Text */}
                    <span className={styles.statusText}>
                        {t("favorites.loading", "Открываем избранное...")}
                    </span>
                </Flex>
            </Box>
        );
    }

    return (
        <Box className={styles.container}>
            <Flex
                direction="column"
                align="center"
                justify="center"
                gap="3"
                className={styles.loadingState}
            >
                <Star size={ICON_SIZE.lg} className={styles.icon} />
                <span className={styles.statusText}>
                    {t("favorites.empty", "Список избранного пуст")}
                </span>
            </Flex>
        </Box>
    );
}
