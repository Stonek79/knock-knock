import type { TFunction } from "i18next";
import { ClientResponseError } from "pocketbase";

/**
 * Парсит ошибку (особенно от PocketBase) и возвращает локализованное,
 * понятное пользователю сообщение.
 * @param error Ошибка (unknown)
 * @param t Функция локализации из useTranslation()
 * @returns Локализованная строка с ошибкой
 */
export function parseCallError(error: unknown, t: TFunction): string {
    if (error instanceof ClientResponseError) {
        // Ошибка сети (PocketBase не смог достучаться до сервера)
        if (error.status === 0) {
            return t(
                "calls.errors.NETWORK_ERROR",
                "Проверьте подключение к интернету",
            );
        }

        // Кастомные коды ошибок, которые мы отдаем с бэкенда в calls.pb.js
        if (error.response?.code) {
            const code = error.response.code;
            // Проверяем, есть ли перевод для такого кода
            const translated = t(`calls.errors.${code}`);
            // i18next возвращает сам ключ, если перевод не найден.
            if (translated !== `calls.errors.${code}`) {
                return translated;
            }
        }
    }

    // Если это стандартный объект Error (но не ClientResponseError, или код не опознан)
    if (error instanceof Error && error.message) {
        // Не показываем пользователю страшные технические ошибки, если они не замаплены
        return t("calls.errors.DEFAULT", "Не удалось выполнить операцию");
    }

    // Fallback для всего остального
    return t("calls.errors.DEFAULT", "Не удалось выполнить операцию");
}
