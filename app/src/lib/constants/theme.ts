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

/**
 * Числовые значения размеров иконок (в пикселях).
 * Соответствуют CSS-токенам при scale-factor = 1.
 */
export const ICON_SIZE = {
    /** 14px — мелкие элементы, чипы, бейджи */
    xs: 14,
    /** 18px — навигация, кнопки, поля ввода */
    sm: 18,
    /** 24px — основные иконки действий */
    md: 24,
    /** 32px — пустые состояния, заглушки */
    lg: 32,
    /** 48px — крупные иллюстративные иконки */
    xl: 48,
    /** 64px — hero-иконки */
    "2xl": 64,
    xxl: 64,
} as const;
