/**
 * Application Logger
 * Централизованный логгер для приложения.
 * В режиме разработки выводит красивые сообщения в консоль.
 * В продакшене может быть подключен к Sentry/Datadog.
 */

class Logger {
    private isDev = import.meta.env.DEV;

    info(message: string, data?: unknown) {
        if (this.isDev) {
            console.info(`%c ℹ️ ${message}`, 'color: #3b82f6', data || '');
        }
    }

    warn(message: string, data?: unknown) {
        console.warn(`%c ⚠️ ${message}`, 'color: #eab308', data || '');
    }

    error(message: string, error?: unknown) {
        console.error(`%c ❌ ${message}`, 'color: #ef4444; font-weight: bold');
        if (error) {
            console.error(error);
        }
    }

    debug(message: string, data?: unknown) {
        if (this.isDev) {
            console.debug(`%c 🐞 ${message}`, 'color: #a855f7', data || '');
        }
    }
}

export const logger = new Logger();
