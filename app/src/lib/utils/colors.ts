import { USER_COLORS } from "../constants";

export type UserColor = (typeof USER_COLORS)[number];

/**
 * Генерирует детерминированный цвет из токенизированной палитры темы
 * на основе строки (имени или ID).
 *
 * @param input - Входная строка (имя пользователя или ID)
 * @returns CSS-значение, ссылающееся на токен цвета активной темы
 */
export function getUserColor(input: string): UserColor {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = input.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % USER_COLORS.length;
    return USER_COLORS[index];
}
