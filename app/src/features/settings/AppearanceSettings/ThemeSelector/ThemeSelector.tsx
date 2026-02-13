import { Box, Flex, Grid, Text } from "@radix-ui/themes";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { DESIGN_THEME, THEME_MODE } from "@/lib/constants/theme";
import { useThemeStore } from "@/stores/theme";
import styles from "./theme-selector.module.css";

export const ThemeSelector = () => {
    const { t } = useTranslation();
    const { theme, setTheme, mode, setMode } = useThemeStore();

    return (
        <Flex direction="column" gap="4" className={styles.container}>
            <Text size="4" weight="bold">
                {t("settings.appearance", "Внешний вид")}
            </Text>

            {/* Mode Toggle */}
            <Flex gap="3" align="center" className={styles.section}>
                <Text size="2" color="gray">
                    {t("settings.mode", "Режим")}:
                </Text>
                <Flex gap="2">
                    <button
                        type="button"
                        onClick={() => setMode(THEME_MODE.LIGHT)}
                        className={clsx(
                            styles.modeBtn,
                            mode === THEME_MODE.LIGHT && styles.active,
                        )}
                    >
                        {t("theme.light", "Светлая")} ☀️
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode(THEME_MODE.DARK)}
                        className={clsx(
                            styles.modeBtn,
                            mode === THEME_MODE.DARK && styles.active,
                        )}
                    >
                        {t("theme.dark", "Темная")} 🌑
                    </button>
                </Flex>
            </Flex>

            {/* Theme Grid */}
            <Grid columns="2" gap="4">
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
                        <Text weight="medium">
                            {t("theme.neonName", "Cosmic Neon")}
                        </Text>
                        {theme === DESIGN_THEME.NEON && (
                            <Text style={{ color: "var(--accent-primary)" }}>
                                ✓
                            </Text>
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
                        <Text weight="medium">
                            {t("theme.emeraldName", "Emerald Luxury")}
                        </Text>
                        {theme === DESIGN_THEME.EMERALD && (
                            <Text style={{ color: "var(--accent-primary)" }}>
                                ✓
                            </Text>
                        )}
                    </Flex>
                </Box>
            </Grid>
        </Flex>
    );
};
