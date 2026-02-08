import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DesignTheme = 'neon' | 'emerald';
export type ThemeMode = 'light' | 'dark';

interface ThemeState {
    theme: DesignTheme;
    mode: ThemeMode;
    setTheme: (theme: DesignTheme) => void;
    setMode: (mode: ThemeMode) => void;
    toggleMode: () => void;
    applyTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'neon',
            mode: 'dark',
            setTheme: (theme) => {
                set({ theme });
                get().applyTheme();
            },
            setMode: (mode) => {
                set({ mode });
                get().applyTheme();
            },
            toggleMode: () => {
                const next = get().mode === 'light' ? 'dark' : 'light';
                set({ mode: next });
                get().applyTheme();
            },
            applyTheme: () => {
                const { theme, mode } = get();
                if (typeof document !== 'undefined') {
                    document.body.setAttribute('data-theme', theme);
                    document.body.setAttribute('data-mode', mode);
                    if (mode === 'dark') {
                        document.documentElement.classList.add('dark');
                        document.body.classList.add('dark');
                        document.body.classList.remove('light');
                    } else {
                        document.documentElement.classList.remove('dark');
                        document.body.classList.remove('dark');
                        document.body.classList.add('light');
                    }
                }
            },
        }),
        {
            name: 'knock-knock-theme',
            onRehydrateStorage: () => (state) => {
                state?.applyTheme();
            },
        },
    ),
);
