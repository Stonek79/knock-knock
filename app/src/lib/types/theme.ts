import type { THEME } from '@/lib/constants/theme';

/**
 * Варианты темы оформления.
 * Использует значения из констант THEME.
 */
export type ThemeValue = (typeof THEME)[keyof typeof THEME];
