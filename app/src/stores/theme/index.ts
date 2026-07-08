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
    scaleFactor: number;
    chatWallpaper: string | null;
    setTheme: (theme: DesignTheme) => void;
    setMode: (mode: ThemeMode) => void;
    setScaleFactor: (scale: number) => void;
    setChatWallpaper: (wallpaper: string | null) => void;
    toggleMode: () => void;
    applyTheme: () => void;
}

/**
 * Стор для управления темой (Default/Neon/Emerald) и режимом (Light/Dark).
 * Дефолтная тема: default/light.
 */
export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: DESIGN_THEME.DEFAULT,
            mode: THEME_MODE.LIGHT,
            scaleFactor: 1,
            chatWallpaper: null,
            setTheme: (theme) => {
                set({ theme });
                get().applyTheme();
            },
            setMode: (mode) => {
                set({ mode });
                get().applyTheme();
            },
            setScaleFactor: (scaleFactor) => {
                set({ scaleFactor });
                get().applyTheme();
            },
            setChatWallpaper: (chatWallpaper) => {
                set({ chatWallpaper });
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
                const { theme, mode, scaleFactor, chatWallpaper } = get();
                if (typeof document !== "undefined") {
                    document.body.setAttribute(
                        THEME_ATTRIBUTES.DATA_THEME,
                        theme,
                    );
                    document.body.setAttribute(
                        THEME_ATTRIBUTES.DATA_MODE,
                        mode,
                    );

                    document.documentElement.style.setProperty(
                        "--scale-factor",
                        scaleFactor.toString(),
                    );
                    if (chatWallpaper) {
                        document.documentElement.style.setProperty(
                            "--bg-chat",
                            `url('${chatWallpaper}')`,
                        );
                    } else {
                        document.documentElement.style.removeProperty(
                            "--bg-chat",
                        );
                    }

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
