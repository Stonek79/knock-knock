import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/shallow";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DESIGN_THEME, THEME_MODE } from "@/lib/constants/theme";
import { useThemeStore } from "@/stores/theme";
import styles from "./theme-selector.module.css";

/**
 * Компонент выбора темы и режима отображения.
 * Реализует адаптивный "переворот" ориентации (Landscape/Portrait).
 */
export const ThemeSelector = () => {
    const { t } = useTranslation();
    const {
        theme,
        setTheme,
        mode,
        setMode,
        scaleFactor,
        setScaleFactor,
        chatWallpaper,
        setChatWallpaper,
    } = useThemeStore(
        useShallow((s) => ({
            theme: s.theme,
            setTheme: s.setTheme,
            mode: s.mode,
            setMode: s.setMode,
            scaleFactor: s.scaleFactor,
            setScaleFactor: s.setScaleFactor,
            chatWallpaper: s.chatWallpaper,
            setChatWallpaper: s.setChatWallpaper,
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

            {/* Масштаб интерфейса */}
            <Flex direction="column" gap="2" className={styles.section}>
                <span className={styles.sectionTitle}>
                    {t("settings.appearance.scale", "Масштаб (Scale)")}:{" "}
                    {scaleFactor.toFixed(1)}
                </span>
                <Flex gap="2" align="center">
                    <Button
                        onClick={() =>
                            setScaleFactor(Math.max(0.5, scaleFactor - 0.1))
                        }
                        className={styles.modeBtn}
                    >
                        -
                    </Button>
                    <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={scaleFactor}
                        onChange={(e) =>
                            setScaleFactor(parseFloat(e.target.value))
                        }
                        className={styles.slider}
                    />
                    <Button
                        onClick={() =>
                            setScaleFactor(Math.min(1.5, scaleFactor + 0.1))
                        }
                        className={styles.modeBtn}
                    >
                        +
                    </Button>
                </Flex>
            </Flex>

            {/* Обои чата */}
            <Flex direction="column" gap="2" className={styles.section}>
                <span className={styles.sectionTitle}>
                    {t("settings.appearance.wallpaper", "Обои чата")}
                </span>
                <Select.Root
                    value={chatWallpaper || "none"}
                    onValueChange={(value) =>
                        setChatWallpaper(value === "none" ? null : value)
                    }
                >
                    <Select.Trigger className={styles.wallpaperSelect}>
                        <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="none">
                            {t("settings.appearance.wallpaperNone", "Нет")}
                        </Select.Item>
                        <Select.Item value="/backgrounds/default_desktop_1783166503530.jpg">
                            {t(
                                "settings.appearance.defaultDesktop",
                                "Default Desktop",
                            )}
                        </Select.Item>
                        <Select.Item value="/backgrounds/emerald_desktop_1783166494421.jpg">
                            {t(
                                "settings.appearance.emeraldDesktop",
                                "Emerald Desktop",
                            )}
                        </Select.Item>
                        <Select.Item value="/backgrounds/neon_desktop_1783166511720.jpg">
                            {t(
                                "settings.appearance.neonDesktop",
                                "Neon Desktop",
                            )}
                        </Select.Item>
                        <Select.Item value="/backgrounds/neon_chat_mobile_1783166485187.jpg">
                            {t("settings.appearance.neonMobile", "Neon Mobile")}
                        </Select.Item>
                    </Select.Content>
                </Select.Root>
            </Flex>
        </Flex>
    );
};
