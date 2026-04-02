import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Grid } from "@/components/layout/Grid";
import { Button } from "@/components/ui/Button";
import { DESIGN_THEME, THEME_MODE } from "@/lib/constants/theme";
import { useThemeStore } from "@/stores/theme";
import styles from "./theme-selector.module.css";

/**
 * Компонент выбора темы и режима отображения.
 * Использует нативные span вместо Radix Text.
 */
export const ThemeSelector = () => {
    const { t } = useTranslation();
    const { theme, setTheme, mode, setMode } = useThemeStore();

    return (
        <Flex direction="column" gap="4" className={styles.container}>
            <span className={styles.sectionTitle}>
                {t("settings.appearance", "Внешний вид")}
            </span>

            {/* Mode Toggle */}
            <Flex gap="3" align="center" className={styles.section}>
                <span className={styles.modeLabel}>
                    {t("settings.mode", "Режим")}:
                </span>
                <Flex gap="2">
                    <Button
                        onClick={() => setMode(THEME_MODE.LIGHT)}
                        className={clsx(
                            styles.modeBtn,
                            mode === THEME_MODE.LIGHT && styles.active,
                        )}
                    >
                        {t("theme.light", "Светлая")} ☀️
                    </Button>
                    <Button
                        onClick={() => setMode(THEME_MODE.DARK)}
                        className={clsx(
                            styles.modeBtn,
                            mode === THEME_MODE.DARK && styles.active,
                        )}
                    >
                        {t("theme.dark", "Темная")} 🌑
                    </Button>
                </Flex>
            </Flex>

            {/* Theme Grid: Default | Neon | Emerald */}
            <Grid columns="3" gap="3">
                {/* Default Option */}
                <Box
                    className={clsx(
                        styles.themeCard,
                        theme === DESIGN_THEME.DEFAULT && styles.selected,
                    )}
                    onClick={() => setTheme(DESIGN_THEME.DEFAULT)}
                >
                    <Box className={styles.previewDefault} />
                    <Flex justify="between" align="center" mt="2">
                        <span className={styles.themeName}>
                            {t("theme.defaultName", "Основная")}
                        </span>
                        {theme === DESIGN_THEME.DEFAULT && (
                            <span className={styles.checkIcon}>✓</span>
                        )}
                    </Flex>
                </Box>
                {/* Neon Option */}
                <Box
                    className={clsx(
                        styles.themeCard,
                        theme === DESIGN_THEME.NEON && styles.selected,
                    )}
                    onClick={() => setTheme(DESIGN_THEME.NEON)}
                >
                    <Box className={styles.previewNeon} />
                    <Flex justify="between" align="center" mt="2">
                        <span className={styles.themeName}>
                            {t("theme.neonName", "Cosmic Neon")}
                        </span>
                        {theme === DESIGN_THEME.NEON && (
                            <span className={styles.checkIcon}>✓</span>
                        )}
                    </Flex>
                </Box>

                {/* Emerald Option */}
                <Box
                    className={clsx(
                        styles.themeCard,
                        theme === DESIGN_THEME.EMERALD && styles.selected,
                    )}
                    onClick={() => setTheme(DESIGN_THEME.EMERALD)}
                >
                    <Box className={styles.previewEmerald} />
                    <Flex justify="between" align="center" mt="2">
                        <span className={styles.themeName}>
                            {t("theme.emeraldName", "Emerald Luxury")}
                        </span>
                        {theme === DESIGN_THEME.EMERALD && (
                            <span className={styles.checkIcon}>✓</span>
                        )}
                    </Flex>
                </Box>
            </Grid>
        </Flex>
    );
};
