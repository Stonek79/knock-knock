# Тестирование UI компонентов

## Инструменты

| Инструмент | Назначение | Установка |
|------------|-----------|-----------|
| **Vitest** | Unit тесты логики | ✅ Уже настроен |
| **Storybook** | Документация компонентов, изолированная разработка | `npx storybook@latest init` |
| **Playwright** | E2E тесты (scroll, анимации, взаимодействия) | `npm init playwright@latest` |

---

## Storybook

### Установка

```bash
cd app
npx storybook@latest init --builder=vite
```

### Запуск

```bash
npm run storybook
```

### Создание stories

```tsx
// src/features/chat/MessageBubble/MessageBubble.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MessageBubble } from "./index";

const meta: Meta<typeof MessageBubble> = {
  title: "Chat/MessageBubble",
  component: MessageBubble,
};

export default meta;
type Story = StoryObj<typeof MessageBubble>;

export const Own: Story = {
  args: {
    content: "Привет!",
    isOwn: true,
    timestamp: new Date().toISOString(),
  },
};

export const Peer: Story = {
  args: {
    content: "Привет!",
    isOwn: false,
    timestamp: new Date().toISOString(),
    senderName: "Иван",
  },
};
```

---

## Playwright

### Установка

```bash
npm init playwright@latest
```

### Конфигурация

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  baseURL: "http://localhost:5173",
  use: {
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
});
```

### Пример теста scroll

```typescript
// e2e/chat-scroll.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Chat Scroll", () => {
  test("scrolls to bottom on load", async ({ page }) => {
    await page.goto("/chat/room-id");
    
    const messageList = page.locator(".scrollContainer");
    const scrollTop = await messageList.evaluate(el => el.scrollTop);
    const scrollHeight = await messageList.evaluate(el => el.scrollHeight);
    const clientHeight = await messageList.evaluate(el => el.clientHeight);
    
    // Должны быть внизу (с допуском 100px)
    expect(scrollHeight - scrollTop - clientHeight).toBeLessThan(100);
  });

  test("scrolls to bottom when new message arrives", async ({ page }) => {
    await page.goto("/chat/room-id");
    
    // Отправляем сообщение
    await page.fill("[placeholder='Сообщение']", "Test message");
    await page.click("[aria-label='Отправить']");
    
    // Проверяем что скролл внизу
    const messageList = page.locator(".scrollContainer");
    await expect(messageList).toHaveJSProperty("scrollTop", {
      timeout: 1000,
    });
  });
});
```

### Запуск тестов

```bash
npx playwright test
npx playwright test --ui  # визуальный режим
```

---

## Рекомендуемая структура

```
app/
├── src/
│   └── features/
│       └── chat/
│           └── MessageBubble/
│               ├── index.tsx
│               └── MessageBubble.stories.tsx  # Storybook
├── e2e/
│   └── chat-scroll.spec.ts  # Playwright
└── playwright.config.ts
```
