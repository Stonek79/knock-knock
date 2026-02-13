/**
 * Константы и типы для экрана ввода PIN-кода (Ghost Mode).
 *
 * Все магические значения вынесены сюда для единообразия и типобезопасности.
 */

/** Длина PIN-кода */
export const PIN_LENGTH = 4;

/** Задержка перед проверкой PIN после ввода последней цифры (мс) */
export const VERIFY_DELAY_MS = 300;

/** Задержка сброса ошибки после анимации тряски (мс) */
export const ERROR_RESET_DELAY_MS = 600;

/** Типы кнопок цифровой клавиатуры */
type NumpadKeyType = "digit" | "empty" | "action";

/** Описание одной кнопки клавиатуры */
export interface NumpadKeyDef {
    readonly id: string;
    readonly type: NumpadKeyType;
    readonly value: string;
}

/** Описание одной точки ввода */
export interface PinDotDef {
    readonly id: string;
    readonly position: number;
}

/**
 * Точки отображения PIN-кода.
 * Каждая точка имеет уникальный id (для React key) и позицию (для filled-логики).
 */
export const PIN_DOTS: readonly PinDotDef[] = [
    { id: "dot-0", position: 0 },
    { id: "dot-1", position: 1 },
    { id: "dot-2", position: 2 },
    { id: "dot-3", position: 3 },
] as const;

/**
 * Раскладка цифровой клавиатуры (3×4 grid).
 * - digit: цифровая кнопка
 * - empty: невидимый placeholder для выравнивания
 * - action: функциональная кнопка (удалить)
 */
export const NUMPAD_KEYS: readonly NumpadKeyDef[] = [
    { id: "key-1", type: "digit", value: "1" },
    { id: "key-2", type: "digit", value: "2" },
    { id: "key-3", type: "digit", value: "3" },
    { id: "key-4", type: "digit", value: "4" },
    { id: "key-5", type: "digit", value: "5" },
    { id: "key-6", type: "digit", value: "6" },
    { id: "key-7", type: "digit", value: "7" },
    { id: "key-8", type: "digit", value: "8" },
    { id: "key-9", type: "digit", value: "9" },
    { id: "key-empty", type: "empty", value: "" },
    { id: "key-0", type: "digit", value: "0" },
    { id: "key-delete", type: "action", value: "delete" },
] as const;

/** Размер иконки замка (px) */
export const LOCK_ICON_SIZE = 48;

/** Размер иконки удаления (px) */
export const DELETE_ICON_SIZE = 24;
