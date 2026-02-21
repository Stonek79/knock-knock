/**
 * Общие типы для UI-компонентов.
 * Используются для унификации размеров, вариантов и других свойств.
 */

/**
 * Стандартные размеры компонентов.
 * Соответствуют t-shirt sizing.
 */
export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

/**
 * Варианты внешнего вида компонентов.
 */
export type ComponentVariant =
    | "solid"
    | "ghost"
    | "outline"
    | "soft"
    | "surface"
    | "glass";

import type { COMPONENT_INTENT, CONTACT_PICKER_MODE } from "@/lib/constants";

/**
 * Семантические намерения (Intents).
 * Используются для окрашивания компонентов в зависимости от контекста.
 */
export type ComponentIntent =
    (typeof COMPONENT_INTENT)[keyof typeof COMPONENT_INTENT];

/**
 * Режим работы компонента ContactPicker.
 */
export type ContactPickerMode =
    (typeof CONTACT_PICKER_MODE)[keyof typeof CONTACT_PICKER_MODE];

/**
 * Иконки (для типизации пропсов).
 */
export type IconSize = ComponentSize;

/**
 * Форма компонентов.
 */
export type ComponentShape = "round" | "square" | "pill" | "circle";
