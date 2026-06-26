import { Link, useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { ADMIN_ITEMS } from "@/config/settings";
import { ICON_SIZE, ROUTES } from "@/lib/constants";
import { SidebarHeader } from "../../navigation/components/SidebarHeader";
import styles from "./adminsidebar.module.css";

/**
 * Боковая панель администрирования с навигационными ссылками.
 */
export function AdminSidebar() {
    const { t } = useTranslation();
    const location = useLocation();

    return (
        <Box className={styles.sidebar}>
            <SidebarHeader title={t("admin.title", "Админка")} />

            <Flex direction="column" gap="1" p="3">
                {ADMIN_ITEMS.map((item) => {
                    const Icon = item.icon;
                    // Для дашборда (путь /admin) проверяем точное совпадение
                    const isActive =
                        item.key === "dashboard"
                            ? location.pathname === ROUTES.ADMIN ||
                              location.pathname === `${ROUTES.ADMIN}/`
                            : location.pathname.startsWith(item.path);

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
            </Flex>
        </Box>
    );
}
