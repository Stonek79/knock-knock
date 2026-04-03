import { Link } from "@tanstack/react-router";
import { UserStar } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { IconButton } from "@/components/ui/IconButton";
import { ROUTES } from "@/lib/constants";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { useAuthStore } from "@/stores/auth";
import styles from "./sidebar-header.module.css";

interface SidebarHeaderProps {
    /** Заголовок раздела (уже переведенный или ключ) */
    title: string;
    /** Дополнительные действия раздела (кнопки, меню) */
    children?: ReactNode;
}

/**
 * Единый хедер для всех списков в сайдбаре (Чаты, Звонки, Контакты, Настройки).
 */
export function SidebarHeader({ title, children }: SidebarHeaderProps) {
    const { t } = useTranslation();
    const isAdmin = useAuthStore((state) => state.isAdmin);

    return (
        <header className={styles.header}>
            <span className={styles.title}>{title}</span>
            <Flex align="center" gap="1" className={styles.actions}>
                {isAdmin && (
                    <IconButton
                        asChild
                        tooltip={t("admin.toAdmin", "Admin Panel")}
                        variant="ghost"
                        size="sm"
                    >
                        <Link to={ROUTES.ADMIN}>
                            <UserStar size={ICON_SIZE.sm} />
                        </Link>
                    </IconButton>
                )}
                {children}
            </Flex>
        </header>
    );
}
