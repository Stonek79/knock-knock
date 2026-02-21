import { Link, useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { SETTINGS_ITEMS } from "@/config/settings";
import { MEMBER_ROLE, ROUTES } from "@/lib/constants";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { useAuthStore } from "@/stores/auth";
import styles from "./settingssidebar.module.css";

/**
 * Боковая панель настроек с навигационными ссылками.
 */
export function SettingsSidebar() {
    const { t } = useTranslation();
    const location = useLocation();

    return (
        <Box className={styles.sidebar}>
            <Box px="4" pt="4" mb="4" className={styles.topPadding} />
            <Flex direction="column" gap="1">
                {SETTINGS_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <Link
                            key={item.key}
                            to={item.path}
                            className={clsx(
                                styles.desktopItem,
                                isActive && styles.active,
                            )}
                        >
                            <Flex align="center" gap="3">
                                <Icon size={ICON_SIZE.sm} />
                                <span className={styles.itemLabel}>
                                    {t(item.labelKey, item.defaultLabel)}
                                </span>
                            </Flex>
                        </Link>
                    );
                })}

                <AdminSidebarItem />
            </Flex>
        </Box>
    );
}

/**
 * Ссылка на Admin Panel — отображается только для роли ADMIN.
 */
function AdminSidebarItem() {
    const { profile } = useAuthStore();
    const { t } = useTranslation();
    const location = useLocation();

    if (profile?.role !== MEMBER_ROLE.ADMIN) {
        return null;
    }

    const isActive = location.pathname.startsWith(ROUTES.ADMIN);

    return (
        <Link
            to={ROUTES.ADMIN}
            className={clsx(styles.desktopItem, isActive && styles.active)}
        >
            <Flex align="center" gap="3">
                <ShieldAlert size={ICON_SIZE.sm} className={styles.icon} />
                <span className={styles.itemLabel}>
                    {t("nav.admin", "Admin Panel")}
                </span>
            </Flex>
        </Link>
    );
}
