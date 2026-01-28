import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEME } from '@/lib/constants/theme';
import type { ThemeValue } from '@/lib/types/theme';

interface ThemeState {
    appearance: ThemeValue;
    setAppearance: (appearance: ThemeValue) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            appearance: THEME.INHERIT,
            setAppearance: (appearance) => set({ appearance }),
        }),
        {
            name: 'theme-storage',
        },
    ),
);
