import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    DESIGN_THEME,
    THEME_ATTRIBUTES,
    THEME_MODE,
    THEME_STORAGE_KEY,
} from "@/lib/constants/theme";
import type { DesignTheme, ThemeMode } from "@/lib/types/theme";

/**
 * Состояние темы приложения.
 */
interface ThemeState {
    theme: DesignTheme;
    mode: ThemeMode;
    setTheme: (theme: DesignTheme) => void;
    setMode: (mode: ThemeMode) => void;
    toggleMode: () => void;
    applyTheme: () => void;
}

/**
 * Стор для управления темой (Neon/Emerald) и режимом (Light/Dark).
 */
export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: DESIGN_THEME.NEON,
            mode: THEME_MODE.DARK,
            setTheme: (theme) => {
                set({ theme });
                get().applyTheme();
            },
            setMode: (mode) => {
                set({ mode });
                get().applyTheme();
            },
            toggleMode: () => {
                const next =
                    get().mode === THEME_MODE.LIGHT
                        ? THEME_MODE.DARK
                        : THEME_MODE.LIGHT;
                set({ mode: next });
                get().applyTheme();
            },
            applyTheme: () => {
                const { theme, mode } = get();
                if (typeof document !== "undefined") {
                    document.body.setAttribute(
                        THEME_ATTRIBUTES.DATA_THEME,
                        theme,
                    );
                    document.body.setAttribute(
                        THEME_ATTRIBUTES.DATA_MODE,
                        mode,
                    );

                    if (mode === THEME_MODE.DARK) {
                        document.documentElement.classList.add(THEME_MODE.DARK);
                        document.body.classList.add(THEME_MODE.DARK);
                        document.body.classList.remove(THEME_MODE.LIGHT);
                    } else {
                        document.documentElement.classList.remove(
                            THEME_MODE.DARK,
                        );
                        document.body.classList.remove(THEME_MODE.DARK);
                        document.body.classList.add(THEME_MODE.LIGHT);
                    }
                }
            },
        }),
        {
            name: THEME_STORAGE_KEY,
            onRehydrateStorage: () => (state) => {
                state?.applyTheme();
            },
        },
    ),
);
