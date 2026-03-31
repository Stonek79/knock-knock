import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

/**
 * Расширенная конфигурация Vitest для интеграционных тестов.
 * Использует реальное подключение к PocketBase (Dev/Staging).
 */
export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            // Маркировка интеграционных тестов
            include: ["src/**/*.integration.test.ts"],

            // Загрузка переменных окружения для тестов
            env: {
                VITE_USE_MOCK: "false",
                VITE_ALLOW_DB_CLEANUP: "true", // Разрешаем хелперу чистить тестовые данные
            },

            // Настройка таймаутов (сетевые запросы могут быть медленнее)
            testTimeout: 30000,
            hookTimeout: 15000,

            // Используем node окружение для прямого взаимодействия с SDK
            environment: "node",
        },
    }),
);
