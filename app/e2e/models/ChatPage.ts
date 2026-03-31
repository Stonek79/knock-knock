import type { Locator, Page } from "@playwright/test";

/**
 * Page Object Model для работы с чатом.
 */
export class ChatPage {
    readonly page: Page;
    readonly messageInput: Locator;
    readonly sendButton: Locator;
    readonly chatList: Locator;
    readonly plusButton: Locator;

    constructor(page: Page) {
        this.page = page;
        // Используем data-testid для стабильности
        this.messageInput = page.getByTestId("message-textarea");
        this.sendButton = page.getByTestId("message-send-button");
        this.chatList = page.locator('[class*="chatList"]');
        this.plusButton = page.getByTestId("plus-button");
    }

    /**
     * Переход на страницу чатов
     */
    async goto() {
        await this.page.goto("/chat");
    }

    /**
     * Открывает модалку создания чата.
     */
    async openCreateChatModal() {
        await this.plusButton.click();
        // В выпадающем меню выбираем "Новый чат" через data-testid
        await this.page.getByTestId("menu-item-new-chat").click();
    }

    /**
     * Выбор первого контакта из списка в модалке.
     */
    async selectFirstContact() {
        const contactItem = this.page.getByTestId("contact-item").first();
        // Ждем появления хотя бы одного контакта
        await contactItem.waitFor({ state: "visible", timeout: 15000 });

        // Получаем имя именно из этого контакта
        const name = await contactItem
            .getByTestId("contact-name")
            .textContent();
        await contactItem.click();
        return name?.trim();
    }

    /**
     * Нажатие кнопки подтверждения создания чата в модалке.
     */
    async confirmChatCreation() {
        const confirmButton = this.page.getByTestId("confirm-create-chat");
        // Ждем, пока кнопка станет активной (после выбора контакта)
        await expect(confirmButton).toBeEnabled({ timeout: 10000 });
        await confirmButton.click();
    }

    /**
     * Отправка сообщения
     */
    async sendMessage(text: string) {
        await this.messageInput.waitFor({ state: "visible" });
        await this.messageInput.fill(text);
        await this.sendButton.click();
    }

    /**
     * Ожидание сообщения в списке
     */
    async waitForMessage(text: string) {
        const message = this.page.locator(`text=${text}`).last();
        await message.waitFor({ state: "visible", timeout: 10000 });
        return message;
    }

    /**
     * Редактирование последнего сообщения
     */
    async editLastMessage(newText: string) {
        const lastMessage = this.page.getByTestId("message-bubble").last();
        await lastMessage.click();

        const editButton = this.page.locator(
            'button[aria-label*="едактировать"]',
        );
        await editButton.click();

        await this.messageInput.fill(newText);
        await this.sendButton.click();
    }

    /**
     * Удаление последнего сообщения
     */
    async deleteLastMessage() {
        const lastMessage = this.page.getByTestId("message-bubble").last();
        await lastMessage.click();

        const deleteButton = this.page.locator('button[aria-label*="далить"]');
        await deleteButton.click();

        // Подтверждение в диалоге
        const confirmButton = this.page
            .getByRole("button", { name: /удалить/i })
            .last();
        await confirmButton.click();
    }
}

// Импортируем expect для использования в POM методах (хотя обычно лучше в тестах, но тут для toBeEnabled)
import { expect } from "@playwright/test";
