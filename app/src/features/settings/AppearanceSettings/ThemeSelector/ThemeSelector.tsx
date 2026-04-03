import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/shallow";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { DESIGN_THEME, THEME_MODE } from "@/lib/constants/theme";
import { useThemeStore } from "@/stores/theme";
import styles from "./theme-selector.module.css";

/**
 * Компонент выбора темы и режима отображения.
 * Реализует адаптивный "переворот" ориентации (Landscape/Portrait).
 */
export const ThemeSelector = () => {
    const { t } = useTranslation();
    const { theme, setTheme, mode, setMode } = useThemeStore(
        useShallow((s) => ({
            theme: s.theme,
            setTheme: s.setTheme,
            mode: s.mode,
            setMode: s.setMode,
        })),
    );

    return (
        <Flex direction="column" gap="4" className={styles.container}>
            <span className={styles.sectionTitle}>
                {t("settings.appearance.appearence", "Внешний вид")}
            </span>

            {/* Конфигурация режима (Светлая/Темная) */}
            <Flex gap="3" align="center" className={styles.section}>
                <span className={styles.modeLabel}>
                    {t("settings.appearance.mode", "Режим")}:
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

            {/* Горизонтальный ряд тем: Автоматически меняет ориентацию при сужении */}
            <Box className={styles.themeGrid}>
                {/* Основная тема */}
                <Box
                    className={clsx(
                        styles.themeCard,
                        theme === DESIGN_THEME.DEFAULT && styles.selected,
                    )}
                    onClick={() => setTheme(DESIGN_THEME.DEFAULT)}
                >
                    <Box
                        className={clsx(
                            styles.previewBase,
                            styles.previewDefault,
                        )}
                    >
                        {theme === DESIGN_THEME.DEFAULT && (
                            <span className={styles.checkIcon}>✓</span>
                        )}
                    </Box>
                    <span className={styles.themeName}>
                        {t("theme.defaultName", "Основная")}
                    </span>
                </Box>

                {/* Тема Neon */}
                <Box
                    className={clsx(
                        styles.themeCard,
                        theme === DESIGN_THEME.NEON && styles.selected,
                    )}
                    onClick={() => setTheme(DESIGN_THEME.NEON)}
                >
                    <Box
                        className={clsx(styles.previewBase, styles.previewNeon)}
                    >
                        {theme === DESIGN_THEME.NEON && (
                            <span className={styles.checkIcon}>✓</span>
                        )}
                    </Box>
                    <span className={styles.themeName}>
                        {t("theme.neonName", "Cosmic Neon")}
                    </span>
                </Box>

                {/* Тема Emerald */}
                <Box
                    className={clsx(
                        styles.themeCard,
                        theme === DESIGN_THEME.EMERALD && styles.selected,
                    )}
                    onClick={() => setTheme(DESIGN_THEME.EMERALD)}
                >
                    <Box
                        className={clsx(
                            styles.previewBase,
                            styles.previewEmerald,
                        )}
                    >
                        {theme === DESIGN_THEME.EMERALD && (
                            <span className={styles.checkIcon}>✓</span>
                        )}
                    </Box>
                    <span className={styles.themeName}>
                        {t("theme.emeraldName", "Emerald Luxury")}
                    </span>
                </Box>
            </Box>
        </Flex>
    );
};
