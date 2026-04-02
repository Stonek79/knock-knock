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

export const THEME_PREVIEW = {
    [DESIGN_THEME.DEFAULT]: { label: "Default" },
    [DESIGN_THEME.NEON]: { label: "Cosmic Neon" },
    [DESIGN_THEME.EMERALD]: { label: "Emerald Luxury" },
} as const;

export const DESIGN_THEMES = [
    DESIGN_THEME.DEFAULT,
    DESIGN_THEME.NEON,
    DESIGN_THEME.EMERALD,
] as const;

export const THEME_MODES = [THEME_MODE.LIGHT, THEME_MODE.DARK] as const;
