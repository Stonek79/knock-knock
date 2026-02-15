/**
 * Константы для оформления приложения.
 */

export const DESIGN_THEME = {
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
