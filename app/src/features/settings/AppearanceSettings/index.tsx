import { Box } from "@/components/layout/Box";
import styles from "./appearance.module.css";
import { ThemeSelector } from "./ThemeSelector/ThemeSelector";

export function AppearanceSettings() {
    return (
        <Box className={styles.container}>
            <ThemeSelector />
        </Box>
    );
}
