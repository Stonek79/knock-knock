import { Link, useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { SETTINGS_ITEMS } from "@/config/settings";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { SidebarHeader } from "../../navigation/components/SidebarHeader";
import styles from "./settingssidebar.module.css";

/**
 * Боковая панель настроек с навигационными ссылками.
 */
export function SettingsSidebar() {
    const { t } = useTranslation();
    const location = useLocation();

    return (
        <Box className={styles.sidebar}>
            <SidebarHeader title={t("settings.title", "Настройки")} />

            <Flex direction="column" gap="1" p="3">
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
            </Flex>
        </Box>
    );
}
