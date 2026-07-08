import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Avatar } from "@/components/ui/Avatar";
import { NAVIGATION_ITEMS } from "@/config/navigation";
import { useIsActive } from "@/hooks/useIsActive";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { NAVIGATION_KEYS, ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";
import styles from "./navigation.module.css";

/**
 * Боковая панель навигации.
 * Адаптированный интерфейс в стиле "Tab Bar" (Mobile) или "BottomNav" (Desktop Sidebar).
 */
export function Navigation() {
    const { t } = useTranslation();
    const checkIsActive = useIsActive();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    const pbUser = useAuthStore((state) => state.pbUser);

    const initials = useMemo(() => {
        if (pbUser?.display_name) {
            const nameParts = pbUser.display_name.split(" ");
            if (nameParts.length >= 2) {
                return (
                    nameParts[0].charAt(0).toUpperCase() +
                    nameParts[1].charAt(0).toUpperCase()
                );
            } else {
                return pbUser.display_name.substring(0, 2).toUpperCase();
            }
        }
        return "?";
    }, [pbUser]);

    const mainItems = NAVIGATION_ITEMS.filter(
        (item) => item.key !== NAVIGATION_KEYS.SETTINGS,
    );
    const settingsItem = NAVIGATION_ITEMS.find(
        (item) => item.key === NAVIGATION_KEYS.SETTINGS,
    );

    return (
        <nav className={styles.navContainer}>
            <Box className={styles.avatarWrapper}>
                {!isMobile && (
                    <Link to={ROUTES.PROFILE} className={styles.avatarProfile}>
                        <Avatar name={initials} />
                    </Link>
                )}
            </Box>
            <Box className={styles.navTop}>
                <div className={styles.navMainItems}>
                    {mainItems.map((item) => {
                        const Icon = item.icon;
                        const active = checkIsActive(item.path);
                        const label = t(item.labelKey, item.defaultLabel);

                        return (
                            <Link
                                key={item.key}
                                to={item.path}
                                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                            >
                                <div className={styles.iconWrapper}>
                                    <Icon className={styles.icon} />
                                </div>
                                <span className={styles.label}>{label}</span>
                            </Link>
                        );
                    })}
                </div>
            </Box>

            {settingsItem && (
                <Box className={styles.navBottom}>
                    <Link
                        to={settingsItem.path}
                        className={`${styles.navItem} ${checkIsActive(settingsItem.path) ? styles.navItemActive : ""}`}
                    >
                        <div className={styles.iconWrapper}>
                            <settingsItem.icon className={styles.icon} />
                        </div>
                        <span className={styles.label}>
                            {t(
                                settingsItem.labelKey,
                                settingsItem.defaultLabel,
                            )}
                        </span>
                    </Link>
                </Box>
            )}
        </nav>
    );
}
