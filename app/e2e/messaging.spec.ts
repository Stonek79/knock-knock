import { expect, test } from "@playwright/test";
import { AuthPage } from "./models/AuthPage";
import { ChatPage } from "./models/ChatPage";

/**
 * Тестирование Messaging Flow на Staging.
 * Разделено на несколько тестов для лучшей диагностики.
 */
test.describe("Messaging Flow (Staging)", () => {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin_password_123";

    // Перед каждым тестом авторизуемся
    test.beforeEach(async ({ page }) => {
        const auth = new AuthPage(page);
        await auth.goto();
        await auth.switchToPasswordMode();
        await auth.login(adminEmail, adminPassword);
        // Увеличиваем таймаут ожидания перехода в чат на Staging
        await expect(page).toHaveURL(/\/chat/, { timeout: 15000 });
    });

    test("шаг 1: создание чата через модалку", async ({ page }) => {
        const chat = new ChatPage(page);

        // 1. Открытие модалки создания
        await chat.openCreateChatModal();

        // 2. Ожидание и выбор первого контакта
        const contactName = await chat.selectFirstContact();
        expect(contactName).toBeTruthy();
        console.log(`Starting chat with: ${contactName}`);

        // 3. Подтверждение создания
        await chat.confirmChatCreation();

        // 4. Проверка перехода в комнату
        await expect(page).toHaveURL(/.*\/chat\/[0-9a-f-]+/, {
            timeout: 15000,
        });

        if (contactName) {
            const headerTitle = page.locator(
                '[class*="RoomHeaderTitle_displayName"]',
            );
            await expect(headerTitle).toContainText(contactName, {
                timeout: 10000,
            });
        }
    });

    test("шаг 2: отправка сообщения", async ({ page }) => {
        const chat = new ChatPage(page);

        // Переходим в любой существующий чат
        const firstChat = page.locator('[class*="chatItem"]').first();
        await firstChat.waitFor({ state: "visible", timeout: 10000 });
        await firstChat.click();

        // Отправка
        const msgText = `Test message ${Date.now()}`;
        await chat.sendMessage(msgText);

        // Проверка появления
        await chat.waitForMessage(msgText);
    });

    test("шаг 3: редактирование и удаление", async ({ page }) => {
        const chat = new ChatPage(page);

        // Заходим в первый чат
        const firstChat = page.locator('[class*="chatItem"]').first();
        await firstChat.waitFor({ state: "visible", timeout: 10000 });
        await firstChat.click();

        // Отправляем сообщение для теста
        const text = `Edit me ${Date.now()}`;
        await chat.sendMessage(text);
        await chat.waitForMessage(text);

        // Редактируем
        const editedText = `${text} (edited)`;
        await chat.editLastMessage(editedText);
        await chat.waitForMessage(editedText);

        // Удаляем
        await chat.deleteLastMessage();

        // Проверяем отсутствие
        await expect(page.locator(`text=${editedText}`)).not.toBeVisible({
            timeout: 10000,
        });
    });
});
