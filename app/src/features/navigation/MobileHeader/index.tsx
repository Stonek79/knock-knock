import { useLocation, useRouter } from "@tanstack/react-router";
import {
    Camera,
    ChevronLeft,
    Lock,
    LogOut,
    MessageSquarePlus,
    MoreVertical,
    Search,
    Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { APP_NAME, CHAT_TYPE } from "@/lib/constants";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { useAuthStore } from "@/stores/auth";
import { useChatDialogs } from "@/stores/ui/chatDialogs";
import styles from "./mobileheader.module.css";

interface MobileHeaderProps {
    /** Заголовок (по умолчанию название приложения) */
    title?: string;
    /** Показывать ли поиск */
    showSearch?: boolean;
    /** Показывать ли камеру */
    showCamera?: boolean;
    /** Показывать ли меню */
    showMenu?: boolean;
}

/**
 * Header для мобильной версии в стиле WhatsApp.
 * Отображает название приложения, иконки камеры, поиска и меню.
 * В суброутах отображает кнопку «Назад».
 */
export function MobileHeader({
    title = APP_NAME,
    showSearch = true,
    showCamera = true,
    showMenu = true,
}: MobileHeaderProps) {
    const { t } = useTranslation();
    const { signOut } = useAuthStore();
    const location = useLocation();
    const router = useRouter();
    const { setOpenDialog } = useChatDialogs();

    const isSubRoute = location.pathname.split("/").filter(Boolean).length > 1;

    const handleBack = () => {
        router.history.back();
    };

    return (
        <header className={styles.header}>
            <Flex align="center" gap="3">
                {isSubRoute && (
                    <Box className={styles.backButton} onClick={handleBack}>
                        <ChevronLeft size={ICON_SIZE.md} />
                    </Box>
                )}
                <h1 className={styles.title}>{title}</h1>
            </Flex>

            <Flex gap="1" align="center">
                {showCamera && !isSubRoute && (
                    <Box className={styles.iconButton}>
                        <Camera size={ICON_SIZE.md} />
                    </Box>
                )}
                {showSearch && (
                    <Box className={styles.iconButton}>
                        <Search size={ICON_SIZE.md} />
                    </Box>
                )}
                {showMenu && (
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <Box className={styles.iconButton}>
                                <MoreVertical size={ICON_SIZE.md} />
                            </Box>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                            <DropdownMenu.Item
                                onSelect={() => setOpenDialog(CHAT_TYPE.PUBLIC)}
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
                                onSelect={() => setOpenDialog(CHAT_TYPE.GROUP)}
                            >
                                <Flex align="center" gap="2">
                                    <Users size={ICON_SIZE.sm} />
                                    {t("chat.newGroup")}
                                </Flex>
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item
                                intent="danger"
                                onClick={signOut}
                            >
                                <Flex gap="2" align="center">
                                    <LogOut size={ICON_SIZE.sm} />
                                    {t("auth.signOut")}
                                </Flex>
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                )}
            </Flex>
        </header>
    );
}
