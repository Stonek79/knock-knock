/**
 * Палитра для детерминированного выделения пользователей.
 * Значения ссылаются только на токены активной темы, поэтому не обходят
 * дизайн-систему и корректно меняются вместе с light/dark-темой.
 */
export const USER_COLORS = [
    "var(--accent-primary)",
    "var(--accent-secondary)",
    "var(--color-success)",
    "var(--color-warning)",
    "var(--color-error)",
    "var(--color-info)",
    "var(--intent-primary-main)",
    "var(--intent-secondary-main)",
    "var(--intent-success-main)",
    "var(--intent-warning-main)",
    "var(--intent-error-main)",
    "var(--intent-info-main)",
] as const;
