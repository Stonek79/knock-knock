import { Box, Flex, Text } from "@radix-ui/themes";
import { Link, useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SETTINGS_ITEMS } from "@/config/settings";
import { MEMBER_ROLE, ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";
import styles from "./settingssidebar.module.css";

export function SettingsSidebar() {
    const { t } = useTranslation();
    const location = useLocation();

    return (
        <Box className={styles.sidebar}>
            <Box px="4" pt="4" mb="4" className={styles.topPadding}></Box>
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
                                <Icon size={18} />
                                <Text>
                                    {t(item.labelKey, item.defaultLabel)}
                                </Text>
                            </Flex>
                        </Link>
                    );
                })}

                {/* Admin Link */}
                <AdminSidebarItem />
            </Flex>
        </Box>
    );
}

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
                <ShieldAlert size={18} className={styles.icon} />
                <Text>{t("nav.admin", "Admin Panel")}</Text>
            </Flex>
        </Link>
    );
}
