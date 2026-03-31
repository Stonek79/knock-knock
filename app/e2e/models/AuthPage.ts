import type { Locator, Page } from "@playwright/test";

/**
 * Page Object Model для страницы авторизации.
 * Инкапсулирует логику взаимодействия с формами входа и регистрации.
 */
export class AuthPage {
    readonly page: Page;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly toRegisterButton: Locator;
    readonly toLoginButton: Locator;
    readonly title: Locator;

    constructor(page: Page) {
        this.page = page;
        this.emailInput = page.locator('input[name="email"]');
        this.passwordInput = page.locator('input[name="password"]');
        this.submitButton = page.locator('button[type="submit"]');
        this.toRegisterButton = page.getByRole("button", {
            name: "Зарегистрироваться",
        });
        this.toLoginButton = page.getByRole("button", {
            name: "Войти",
            exact: true,
        });
        this.title = page.locator("h1");
    }

    /**
     * Переход на страницу входа
     */
    async goto() {
        await this.page.goto("/login");
    }

    /**
     * Переключение в режим входа по паролю
     */
    async switchToPasswordMode() {
        const passwordModeButton = this.page.getByRole("button", {
            name: "Войти с паролем",
        });
        await passwordModeButton.click();
    }

    /**
     * Переключение в режим регистрации
     */
    async switchToRegister() {
        await this.toRegisterButton.click();
    }

    /**
     * Переключение в режим входа
     */
    async switchToLogin() {
        const toLoginLink = this.page
            .getByRole("button", { name: "Войти" })
            .last();
        await toLoginLink.click();
    }

    /**
     * Заполнение формы и отправка
     */
    async login(email: string, password?: string) {
        await this.emailInput.fill(email);
        if (password) {
            await this.passwordInput.fill(password);
        }
        await this.submitButton.click();
    }

    /**
     * Проверка наличия ошибки на форме
     */
    async getErrorMessage() {
        return this.page.locator('[role="alert"]').textContent();
    }

    /**
     * Выход из аккаунта через страницу настроек
     */
    async logout() {
        await this.page.goto("/settings");
        const signOutButton = this.page.getByRole("button", {
            name: "Выйти",
            exact: true,
        });
        await signOutButton.click();
    }

    /**
     * Получение текущего пути
     */
    async url() {
        return this.page.url();
    }
}
