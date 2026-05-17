import type { DESIGN_THEME, ICON_SIZE, THEME_MODE } from "../constants/theme";

export type DesignTheme = (typeof DESIGN_THEME)[keyof typeof DESIGN_THEME];
export type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE];

/** Тип ключей размеров иконок */
export type IconSizeKey = keyof typeof ICON_SIZE;
