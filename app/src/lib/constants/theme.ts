/**
 * Константы для оформления приложения.
 */

export const DESIGN_THEME = {
    DEFAULT: "default",
    NEON: "neon",
    EMERALD: "emerald",
} as const;

export const THEME_MODE = {
    LIGHT: "light",
    DARK: "dark",
} as const;

export const THEME_STORAGE_KEY = "knock-knock-theme";

export const THEME_ATTRIBUTES = {
    DATA_THEME: "data-theme",
    DATA_MODE: "data-mode",
} as const;

/**
 * Настройки Radix UI для каждой темы.
 */
export const RADIX_THEME = {
    [DESIGN_THEME.DEFAULT]: {
        ACCENT: "blue",
        GRAY: "slate",
    },
    [DESIGN_THEME.EMERALD]: {
        ACCENT: "gold",
        GRAY: "olive",
    },
    [DESIGN_THEME.NEON]: {
        ACCENT: "teal",
        GRAY: "slate",
    },
    DEFAULT_RADIUS: "medium",
    DEFAULT_PANEL_BACKGROUND: "translucent",
} as const;

export const DESIGN_THEMES = [
    DESIGN_THEME.DEFAULT,
    DESIGN_THEME.NEON,
    DESIGN_THEME.EMERALD,
] as const;

export const THEME_MODES = [THEME_MODE.LIGHT, THEME_MODE.DARK] as const;
