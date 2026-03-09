import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright конфигурация для Knock-Knock
 *
 * Поддерживает три среды тестирования:
 * - mock: локальные тесты с mock-данными
 * - staging: E2E тесты на удаленном тестовом Supabase
 * - production: ручное тестирование на production (осторожно!)
 */

export default defineConfig({
    testDir: "./e2e",

    // Таймауты
    timeout: 30 * 1000,
    expect: {
        timeout: 5000,
    },

    // Запуск тестов параллельно
    fullyParallel: true,

    // Фолбэк на последовательный запуск для стабильности
    workers: "50%",

    // Запретить повторное использование тестов
    forbidOnly: !!process.env.CI,

    // Повторные попытки в CI
    retries: process.env.CI ? 2 : 0,

    // Репортеры
    reporter: [
        ["list"],
        ["html", { outputFolder: "e2e-report", open: "never" }],
        ["json", { outputFile: "e2e-results.json" }],
    ],

    // Общие настройки для всех тестов
    use: {
        // Базовый URL приложения
        baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",

        // Сбор данных при падении
        trace: "on-first-retry",
        video: "retain-on-failure",
        screenshot: "only-on-failure",

        // Эмуляция мобильного устройства (по умолчанию)
        ...devices["iPhone 14"],

        // Контекст браузера
        locale: "ru-RU",
        timezoneId: "Europe/Moscow",
    },

    // Проекты для разных сред
    projects: [
        {
            name: "mock",
            testMatch: /.*\.spec\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                env: {
                    VITE_USE_MOCK: "true",
                },
            },
        },

        {
            name: "staging",
            testMatch: /.*\.spec\.ts/,
            use: {
                ...devices["iPhone 14"],
                env: {
                    VITE_USE_MOCK: "false",
                    // Все переменные должны быть заданы через .env.test файл
                    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
                    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
                },
            },
        },

        {
            name: "production",
            testMatch: /.*\.manual\.spec\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                env: {
                    VITE_USE_MOCK: "false",
                    // Все переменные должны быть заданы через .env.production файл
                    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
                    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
                },
            },
        },
    ],

    // WebServer для автоматического запуска приложения перед тестами
    webServer: {
        // Команда запуска сервера
        command: process.env.CI
            ? "npm run build && npm run preview"
            : "npm run dev",
        // Порт приложения
        url: "http://localhost:5173",
        // Переиспользовать существующий сервер (не в CI)
        reuseExistingServer: !process.env.CI,
        // Таймаут запуска (2 минуты для dev, 5 для build)
        timeout: process.env.CI ? 5 * 60 * 1000 : 2 * 60 * 1000,
        // stdout для отладки
        stdout: "pipe",
        // stderr для отладки
        stderr: "pipe",
        // Переменные окружения для сервера
        env: {
            // В CI использовать mock, если не задано иное
            VITE_USE_MOCK: process.env.VITE_USE_MOCK || "true",
        },
    },
});
