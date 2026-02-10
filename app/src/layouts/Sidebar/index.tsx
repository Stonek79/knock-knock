import { Box } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { BottomNav } from "@/layouts/BottomNav";
import styles from "./sidebar.module.css";

interface SidebarProps {
    children: ReactNode;
    collapsed?: boolean;
}

/**
 * Универсальный сайдбар для десктопа.
 * Содержит контент (напр. список чатов) и нижнюю навигацию.
 */
export function Sidebar({ children, collapsed }: SidebarProps) {
    return (
        <aside className={styles.sidebar} data-collapsed={collapsed}>
            <Box className={styles.content}>{children}</Box>
            <Box className={styles.footer}>
                <BottomNav variant="desktop" />
            </Box>
        </aside>
    );
}
