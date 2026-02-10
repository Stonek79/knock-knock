import { logger } from "@/lib/logger";

/**
 * Сервис для работы с буфером обмена.
 * Абстрагирует работу с window/navigator для кроссплатформенности.
 * В будущем здесь можно добавить реализацию для Capacitor/Cordova.
 */
export const ClipboardService = {
    /**
     * Копирует текст в буфер обмена.
     * Безопасно обрабатывает отсутствие navigator.clipboard.
     */
    copy: async (text: string): Promise<boolean> => {
        try {
            // Проверка наличия API (например, в SSR или старых браузерах)
            if (typeof navigator === "undefined" || !navigator.clipboard) {
                logger.warn("Clipboard API not available");
                return false;
            }

            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            logger.error("Failed to copy to clipboard", error);
            return false;
        }
    },
};
