import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { NAVIGATION_ITEMS } from "@/config/navigation";
import { useIsActive } from "@/hooks/useIsActive";
import styles from "./navigation.module.css";

/**
 * Боковая панель навигации.
 * Адаптированный интерфейс в стиле "Tab Bar" (Mobile) или "BottomNav" (Desktop Sidebar).
 */
export function Navigation() {
    const { t } = useTranslation();
    const checkIsActive = useIsActive();

    return (
        <nav className={styles.navContainer}>
            {NAVIGATION_ITEMS.map((item) => {
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
        </nav>
    );
}
