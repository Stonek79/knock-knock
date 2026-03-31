import { expect, test } from "@playwright/test";
import { AuthPage } from "./models/AuthPage";

test.describe("Авторизация", () => {
    let authPage: AuthPage;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        await authPage.goto();
    });

    test("должен отображать форму входа по умолчанию", async () => {
        await expect(authPage.title).toHaveText("Вход");
        await expect(authPage.emailInput).toBeVisible();
    });

    test("должен переключаться между входом и регистрацией", async () => {
        await authPage.switchToRegister();
        await expect(authPage.title).toHaveText("Создание аккаунта");

        await authPage.switchToLogin();
        await expect(authPage.title).toHaveText("Вход");
    });

    test("должен успешно регистрировать нового пользователя", async () => {
        await authPage.switchToRegister();
        await authPage.switchToPasswordMode(); // Чтобы задать пароль

        const uniqueEmail = `test-${Date.now()}@example.com`;
        await authPage.login(uniqueEmail, "securePassword123");

        // При регистрации на Staging показывается экран успеха
        // Ждем появления заголовка "Проверьте почту"
        const successMessage = authPage.page.locator("h2");
        await expect(successMessage).toHaveText("Проверьте почту", {
            timeout: 10000,
        });
    });

    test("должен успешно входить под тестовым пользователем (SEED)", async () => {
        await authPage.switchToPasswordMode();

        const testEmail = process.env.ADMIN_EMAIL || "admin-test@example.com";
        const testPassword =
            process.env.ADMIN_PASSWORD || "your_secure_test_password";

        await authPage.login(testEmail, testPassword);

        // Ждем редиректа в чат. Если редирект не происходит, выводим ошибку из UI
        try {
            await expect(authPage.page).toHaveURL(/.*\/chat/, {
                timeout: 10000,
            });
        } catch (e) {
            const errorMsg = await authPage.getErrorMessage();
            if (errorMsg) {
                throw new Error(
                    `Авторизация не удалась. Ошибка на экране: ${errorMsg}`,
                );
            }
            throw e;
        }
    });

    test("должен показывать ошибку при неверных данных", async () => {
        await authPage.switchToPasswordMode();
        await authPage.login("wrong@example.com", "wrong-password");

        const error = await authPage.getErrorMessage();
        expect(error).toBeTruthy();
    });

    test("должен сохранять сессию после перезагрузки", async () => {
        await authPage.switchToPasswordMode();
        const testEmail = process.env.ADMIN_EMAIL || "admin-test@example.com";
        const testPassword =
            process.env.ADMIN_PASSWORD || "your_secure_test_password";

        await authPage.login(testEmail, testPassword);
        await expect(authPage.page).toHaveURL(/.*\/chat/, { timeout: 10000 });

        await authPage.page.reload();
        await expect(authPage.page).toHaveURL(/.*\/chat/, { timeout: 10000 });
    });
});
