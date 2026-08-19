/**
 * Application Logger
 * Централизованный логгер для приложения.
 * В режиме разработки выводит красивые сообщения в консоль.
 * В продакшене может быть подключен к Sentry/Datadog.
 */

export const logger = {
    info: (message: string, data?: unknown) => {
        const isDev = import.meta.env.DEV;
        if (isDev) {
            console.info(`ℹ️ ${message}`, data || "");
        }
    },

    warn: (message: string, data?: unknown) => {
        console.warn(`⚠️ ${message}`, data || "");
    },

    error: (message: string, error?: unknown) => {
        console.error(`❌ ${message}`);
        if (error) {
            console.error(error);
        }
    },

    debug: (message: string, data?: unknown) => {
        const isDev = import.meta.env.DEV;
        if (isDev) {
            console.debug(`🐞 ${message}`, data || "");
        }
    },
};
