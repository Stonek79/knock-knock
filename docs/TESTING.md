# Тестирование Knock-Knock

> Последнее обновление: Март 2026  
> Статус: 🟡 Частично реализовано

---

## 📊 Обзор стратегии тестирования

Knock-Knock использует **многоуровневую стратегию тестирования** с поддержкой трех сред выполнения:

```
┌─────────────────────────────────────────────────────────────────┐
│                        ТЕСТОВЫЕ СРЕДЫ                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   LOCAL      │  │   STAGING    │  │ PRODUCTION   │          │
│  │  (Mock DB)   │  │ (Remote DB)  │  │  (Real DB)   │          │
│  │              │  │              │  │              │          │
│  │ VITE_USE_    │  │ VITE_USE_    │  │ VITE_USE_    │          │
│  │ MOCK=true    │  │ MOCK=false   │  │ MOCK=false   │          │
│  │              │  │              │  │              │          │
│  │ Unit-тесты   │  │ E2E-тесты    │  │ Ручное       │          │
│  │ Storybook    │  │ Integration  │  │ тестирование │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Среды выполнения

| Среда | Описание | Переменные окружения | Назначение |
|-------|----------|---------------------|------------|
| **Local (Mock)** | In-memory эмуляция Supabase | `VITE_USE_MOCK=true` | Unit-тесты, разработка UI |
| **Staging** | Удаленный тестовый Supabase на домашнем сервере | `VITE_USE_MOCK=false`, `VITE_SUPABASE_URL=<из .env.test>` | E2E тесты, integration тесты |
| **Production** | Боевой Supabase | `VITE_USE_MOCK=false`, `VITE_SUPABASE_URL=<из .env.production>` | Ручное тестирование, демо |

> ⚠️ **Важно:** Конкретные значения (IP-адреса, ключи) хранятся ТОЛЬКО в локальных файлах `.env.test` и `.env.production`, которые НЕ попадают в git. См. [TEST_ENV_SETUP.md](./TEST_ENV_SETUP.md) для инструкций по настройке.

---

## ✅ Реализовано (Implemented)

### 1. Unit-тестирование (Vitest)

**Статус:** ✅ Полностью реализовано

**Инструменты:**
- Vitest (v4.0.18)
- Testing Library (React, DOM)
- JSDOM (эмуляция браузера)

**Покрытие:**
```
app/src/
├── lib/
│   ├── crypto/
│   │   └── recovery.test.ts              # Тесты восстановления ключей
│   └── services/
│       ├── message.test.ts               # Тесты MessageService
│       └── room.test.ts                  # Тесты RoomService (создание, добавление участников)
├── features/
│   ├── chat/
│   │   ├── chat.actions.test.tsx         # Тесты действий с сообщениями
│   │   ├── chat.integration.test.tsx     # Integration тесты чатов
│   │   ├── chat.unread.test.tsx          # Тесты непрочитанных сообщений
│   │   ├── message/
│   │   │   └── components/
│   │   │       └── AudioMessagePlayer/
│   │   │           └── AudioMessagePlayer.test.tsx
│   │   └── room/
│   │       └── components/
│   │           └── ChatRoom/
│   │               └── store/
│   │                   └── store.test.ts
│   ├── presence/
│   │   └── hooks/
│   │       └── useGroupPresence.test.ts  # Тесты присутствия в группе
│   └── settings/
│       └── SecuritySettings/
│           └── hooks/
│               └── useKeysBackup.test.ts # Тесты бэкапа ключей
├── components/ui/
│   ├── Error/
│   │   └── RouteErrorFallback.test.tsx
│   ├── GlobalLoader/
│   │   └── GlobalLoader.test.tsx
│   ├── SectionLoader/
│   │   └── SectionLoader.test.tsx
│   └── Slider/
│       └── Slider.test.tsx
├── pages/
│   └── SettingsIndexPage/
│       └── SettingsIndexPage.test.tsx
├── stores/
│   ├── auth/
│   │   └── auth.test.ts                  # Тесты auth store
│   └── ghost/
│       └── ghost.test.ts                 # Тесты Ghost Mode
└── test/
    └── chat-route.test.tsx               # Тесты маршрутов чатов
```

**Запуск тестов:**
```bash
cd app

# Все тесты
npm run test

# С покрытием
npm run test:coverage

# В режиме watch (разработка)
npm run test:watch
```

**Конфигурация Vitest:**
```typescript
// vitest.config.ts (встроен в vite.config.ts)
{
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Mock-режим для всех тестов
    env: {
      VITE_USE_MOCK: 'true',
    },
  }
}
```

**Особенности:**
- ✅ Все тесты работают **только с Mock-режимом** (`VITE_USE_MOCK=true`)
- ✅ Mock-клиент эмулирует Supabase API (auth, storage, realtime)
- ✅ Тесты изолированы, не требуют подключения к БД
- ✅ Криптография мокируется через `vi.mock()`

**Пример теста (room.test.ts):**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { RoomService } from './room';

// Мокируем криптографию
vi.mock('@/lib/crypto/encryption', () => ({
  wrapRoomKey: vi.fn().mockResolvedValue({
    ephemeralPublicKey: new ArrayBuffer(0),
    iv: new ArrayBuffer(0),
    ciphertext: new ArrayBuffer(0),
  }),
}));

describe('RoomService', () => {
  it('создает комнату с E2E шифрованием', async () => {
    const result = await RoomService.createRoom(
      'Test Room',
      'group',
      'user-1',
      ['user-2', 'user-3']
    );
    
    expect(result.isOk()).toBe(true);
    expect(result.value).toHaveProperty('roomId');
    expect(result.value).toHaveProperty('roomKey');
  });
});
```

---

### 2. Storybook (UI-компоненты)

**Статус:** ✅ Установлен, требуется настройка

**Инструменты:**
- Storybook (v10.2.6)
- @storybook/react-vite
- @storybook/addon-a11y (доступность)
- @storybook/addon-docs (документация)

**Запуск:**
```bash
cd app
npm run storybook
```

**Структура stories (рекомендуемая):**
```
app/src/
└── features/
    └── chat/
        └── message/
            └── components/
                └── MessageBubble/
                    ├── index.tsx
                    └── MessageBubble.stories.tsx
```

**Пример story:**
```tsx
// MessageBubble.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MessageBubble } from './index';

const meta: Meta<typeof MessageBubble> = {
  title: 'Chat/MessageBubble',
  component: MessageBubble,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MessageBubble>;

export const OwnMessage: Story = {
  args: {
    content: 'Привет!',
    isOwn: true,
    timestamp: new Date().toISOString(),
    status: 'read',
  },
};

export const PeerMessage: Story = {
  args: {
    content: 'Привет!',
    isOwn: false,
    timestamp: new Date().toISOString(),
    senderName: 'Иван',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ivan',
  },
};

export const DeletedMessage: Story = {
  args: {
    content: null,
    isDeleted: true,
    isOwn: false,
    timestamp: new Date().toISOString(),
  },
};
```

---

### 3. Mock-режим (In-Memory Supabase)

**Статус:** ✅ Полностью реализовано

**Файлы:**
- `app/src/lib/mock/client.ts` — Mock-клиент Supabase
- `app/src/lib/mock/data.ts` — Тестовые данные (пользователи, комнаты, сообщения)
- `app/src/lib/mock/queries/*.ts` — Эмуляция запросов
- `app/src/lib/mock/realtime.ts` — Эмуляция realtime-подписок

**Возможности:**
- ✅ Авторизация (signInWithPassword, signInWithOtp, signOut)
- ✅ CRUD операции (profiles, rooms, messages, room_members, room_keys)
- ✅ Realtime-подписки (postgres_changes)
- ✅ Storage (загрузка файлов в IndexedDB)
- ✅ RPC-функции

**Тестовые пользователи (MOCK_USERS):**
```typescript
[
  { id: 'user-1', email: 'alex@example.com', display_name: 'Alex' },
  { id: 'user-2', email: 'elon@spacex.com', display_name: 'Elon' },
  { id: 'user-3', email: 'pavel@telegram.org', display_name: 'Pavel' },
  { id: 'user-4', email: 'satoshi@bitcoin.org', display_name: 'Satoshi' },
  { id: 'user-5', email: 'linus@linux.org', display_name: 'Linus' },
  { id: 'user-6', email: 'admin@linux.org', display_name: 'Admin', role: 'admin' },
]
```

**Включение:**
```bash
# app/.env
VITE_USE_MOCK=true
```

---

### 4. Инфраструктура для тестирования

**Статус:** ✅ Частично реализовано

**Существующие скрипты:**
- `infra/scripts/seed_data.cjs` — Сид данных в Supabase (тестовые пользователи, чаты, сообщения)
- `infra/scripts/fix_db.cjs` — Применение миграций на удаленном сервере
- `app/supabase/gen-types.sh` — Генерация TypeScript типов из БД

**Запуск seed-скрипта:**
```bash
cd infra/scripts
node seed_data.cjs
```

**Требования:**
- Переменные в `app/.env`:
  - `VITE_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (не anon key!)

---

## 🚧 Требуется реализация (TODO)

### 1. Переменные окружения для разных сред

**Статус:** ❌ Не реализовано  
**Приоритет:** 🔴 Критично

**Задача:** Разделить конфигурацию для Local, Staging, Production

**Структура файлов:**
```
app/
├── .env.example              # Шаблон (в git)
├── .env.local                # Локальная разработка (игнорируется)
├── .env.test                 # Тестовая среда (Staging)
├── .env.production           # Production
└── .env                      # Текущая (игнорируется)
```

**Содержимое `.env.example`:**
```bash
# Базовая конфигурация
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_USE_MOCK=true

# Для seed-скриптов (не в client!)
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_CLI_PASSWORD=
SUPABASE_HOME_IP_ADDRESS=192.168.1.142
```

**Содержимое `.env.test` (Staging):**
```bash
# Тестовый Supabase на домашнем сервере
# ⚠️ Замените значения на ваши из ~/supabase/docker/.env
VITE_SUPABASE_URL=http://<home-server-ip>:8001
VITE_SUPABASE_ANON_KEY=<test-anon-key-from-staging>
VITE_USE_MOCK=false

# Service role для тестов
SUPABASE_SERVICE_ROLE_KEY=<test-service-key-from-staging>
```

**Содержимое `.env.production`:**
```bash
# Production Supabase
# ⚠️ Замените значения на ваши production ключи
VITE_SUPABASE_URL=<production-url>
VITE_SUPABASE_ANON_KEY=<production-anon-key>
VITE_USE_MOCK=false

SUPABASE_SERVICE_ROLE_KEY=<production-service-key>
```

> 📖 **Инструкции по настройке Staging:** См. [TEST_ENV_SETUP.md](./TEST_ENV_SETUP.md) для подробного руководства по настройке тестового окружения на домашнем сервере.

**Скрипт переключения сред:**
```bash
#!/bin/bash
# scripts/use-env.sh

if [ -z "$1" ]; then
  echo "Usage: ./scripts/use-env.sh <environment>"
  echo "Available: local, staging, production"
  exit 1
fi

ENV_FILE=".env.$1"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ File $ENV_FILE not found"
  exit 1
fi

cp "$ENV_FILE" .env
echo "✅ Switched to $1 environment"
```

**Использование:**
```bash
./scripts/use-env.sh staging
npm run dev
```

---

### 2. Staging-окружение (Удаленный тестовый Supabase)

**Статус:** ❌ Не реализовано  
**Приоритет:** 🔴 Критично

**Задача:** Поднять изолированный тестовый Supabase на домашнем сервере

**Вариант A: Отдельный Docker Compose (рекомендуется)**

1. Создать конфигурацию для тестового Supabase на домашнем сервере:
```bash
# На домашнем сервере
cd ~/supabase/docker
cp docker-compose.yml docker-compose.test.yml
```

2. Отредактировать `docker-compose.test.yml`, изменив порт Kong на 8001:
```yaml
services:
  kong:
    ports:
      - "8001:8000"  # Тестовый API на порту 8001
```

3. Запустить тестовый Supabase:
```bash
docker compose -f docker-compose.test.yml up -d
```

4. Применить миграции:
```bash
cd /path/to/knock-knock/app
npx supabase db push --db-url "postgresql://postgres:<password>@<home-server-ip>:54322/postgres"
```

5. Создать тестовых пользователей:
```bash
node infra/scripts/seed_data.cjs
```

> 📖 **Полная инструкция:** См. [TEST_ENV_SETUP.md](./TEST_ENV_SETUP.md) для детального руководства по настройке.

**Вариант B: Изолированные схемы в существующем Supabase**

Использовать отдельные PostgreSQL схемы для тестов:
- `public` — production
- `test` — тестовые данные

---

### 3. Playwright E2E тесты

**Статус:** ❌ Не реализовано  
**Приоритет:** 🔴 Критично

**Инструменты:**
- Playwright (v1.58.1) — ✅ Уже установлен
- @playwright/test

**Установка:**
```bash
cd app
npx playwright install
```

**Структура:**
```
app/
├── e2e/
│   ├── fixtures/
│   │   ├── test-users.ts       # Фабрика тестовых пользователей
│   │   ├── auth-fixture.ts     # Фикстура авторизации
│   │   └── cleanup.ts          # Очистка после тестов
│   ├── specs/
│   │   ├── auth.spec.ts        # Регистрация, вход
│   │   ├── chat.spec.ts        # Создание чатов, сообщения
│   │   ├── groups.spec.ts      # Групповые чаты
│   │   ├── media.spec.ts       # Загрузка файлов
│   │   └── crypto.spec.ts      # E2E шифрование
│   └── utils/
│       ├── db-helpers.ts       # Очистка БД
│       └── crypto-helpers.ts   # Генерация ключей
├── playwright.config.ts
└── .env.test
```

**Конфигурация Playwright:**
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  
  // Проекты для разных сред
  projects: [
    {
      name: 'mock',
      use: {
        baseURL: 'http://localhost:5173',
        env: { VITE_USE_MOCK: 'true' },
      },
    },
    {
      name: 'staging',
      use: {
        baseURL: 'http://localhost:5173',
        env: {
          VITE_USE_MOCK: 'false',
          // Загружается из .env.test
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
        },
      },
    },
  ],
  
  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  
  reporter: [
    ['html', { outputFolder: 'e2e-report' }],
    ['list'],
  ],
});
```

**Примеры тестов:**

#### auth.spec.ts — Авторизация
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('вход с паролем', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'test1@knock-knock.test');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/chat');
    await expect(page.locator('[data-testid="chat-list"]')).toBeVisible();
  });
  
  test('регистрация нового пользователя', async ({ page }) => {
    const email = `test+${Date.now()}@knock-knock.test`;
    const password = 'Test123!';
    
    await page.goto('/register');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', password);
    await page.fill('[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    
    // Проверка: письмо не требуется (тестовый режим)
    await expect(page).toHaveURL('/chat');
  });
});
```

#### chat.spec.ts — Чаты
```typescript
import { test, expect } from '@playwright/test';
import { loginAsUser } from '../fixtures/auth-fixture';

test.describe('Chat', () => {
  test('создание личного чата (DM)', async ({ page }) => {
    await loginAsUser(page, 'test1@knock-knock.test', 'Test123!');
    
    await page.click('[data-testid="create-chat"]');
    await page.click('[data-testid="create-dm"]');
    
    // Поиск пользователя
    await page.fill('[data-testid="user-search"]', 'test2@knock-knock.test');
    await page.click(`[data-user-id="test-user-2-id"]`);
    await page.click('[data-testid="create"]');
    
    // Проверка: чат открыт
    await expect(page.locator('[data-testid="chat-header"]'))
      .toContainText('Test User 2');
  });
  
  test('отправка текстового сообщения', async ({ page }) => {
    await loginAsUser(page, 'test1@knock-knock.test', 'Test123!');
    await page.click('[data-testid="chat-room-test-user-2"]');
    
    await page.fill('[data-testid="message-input"]', 'Привет!');
    await page.click('[data-testid="send-button"]');
    
    // Проверка: сообщение отправлено
    const lastMessage = page.locator('[data-testid="message"]:last-child');
    await expect(lastMessage).toContainText('Привет!');
    await expect(lastMessage.locator('[data-testid="message-status"]'))
      .toHaveAttribute('data-status', 'sent|delivered');
  });
  
  test('удаление сообщения', async ({ page }) => {
    // ... отправка сообщения
    await page.click('[data-testid="message-options"]');
    await page.click('[data-testid="delete-message"]');
    await page.click('[data-testid="confirm-delete"]');
    
    // Проверка: сообщение помечено как удаленное
    await expect(page.locator('[data-testid="deleted-message"]'))
      .toBeVisible();
  });
});
```

#### groups.spec.ts — Групповые чаты
```typescript
import { test, expect } from '@playwright/test';

test.describe('Group Chat', () => {
  test('создание группы', async ({ page }) => {
    await loginAsUser(page, 'test1@knock-knock.test', 'Test123!');
    
    await page.click('[data-testid="create-chat"]');
    await page.click('[data-testid="create-group"]');
    
    // Название группы
    await page.fill('[data-testid="group-name"]', 'Test Group');
    
    // Выбор участников (минимум 2)
    await page.click('[data-testid="contact-select-test2"]');
    await page.click('[data-testid="contact-select-test3"]');
    
    await page.click('[data-testid="create-group-submit"]');
    
    // Проверка: группа создана
    await expect(page.locator('[data-testid="group-info-header"]'))
      .toContainText('Test Group');
  });
  
  test('добавление участника в группу', async ({ page }) => {
    // ... открыть группу
    await page.click('[data-testid="group-info"]');
    await page.click('[data-testid="add-member"]');
    
    await page.click('[data-testid="contact-select-test4"]');
    await page.click('[data-testid="confirm-add"]');
    
    // Проверка: участник добавлен
    await expect(page.locator('[data-testid="member-list"]'))
      .toContainText('Test User 4');
  });
  
  test('выход из группы', async ({ page }) => {
    // ... открыть настройки группы
    await page.click('[data-testid="leave-group"]');
    await page.click('[data-testid="confirm-leave"]');
    
    // Проверка: редирект на /chat
    await expect(page).toHaveURL('/chat');
  });
});
```

#### media.spec.ts — Медиа
```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Media', () => {
  test('загрузка изображения', async ({ page }) => {
    await loginAsUser(page, 'test1@knock-knock.test', 'Test123!');
    await page.click('[data-testid="chat-room-test-user-2"]');
    
    const testImage = path.join(__dirname, '../fixtures/test-image.png');
    
    await page.setInputFiles(
      '[data-testid="file-input"]',
      testImage
    );
    
    await page.click('[data-testid="send-media"]');
    
    // Проверка: изображение в чате
    await expect(page.locator('[data-testid="message-image"]'))
      .toBeVisible();
  });
  
  test('отправка голосового сообщения', async ({ page }) => {
    await loginAsUser(page, 'test1@knock-knock.test', 'Test123!');
    await page.click('[data-testid="chat-room-test-user-2"]');
    
    await page.click('[data-testid="voice-message-button"]');
    await page.waitForTimeout(2000); // 2 секунды записи
    await page.click('[data-testid="voice-message-send"]');
    
    // Проверка: аудио плеер
    await expect(page.locator('[data-testid="audio-player"]'))
      .toBeVisible();
  });
});
```

**Запуск E2E тестов:**
```bash
# Все тесты
npx playwright test

# Конкретный проект (staging)
npx playwright test --project=staging

# Конкретный файл
npx playwright test e2e/specs/chat.spec.ts

# В режиме UI
npx playwright test --ui

# С отчетом
npx playwright test --reporter=html
npx playwright show-report
```

---

### 4. Integration тесты (Vitest + Real DB)

**Статус:** ❌ Не реализовано  
**Приоритет:** 🟡 Высокий

**Задача:** Тестирование сервисов с реальной БД (Staging)

**Конфигурация:**
```typescript
// vitest.integration.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    mode: 'integration',
    environment: 'node',
    globals: true,
    // Real DB (не mock)
    env: {
      VITE_USE_MOCK: 'false',
      // Загружается из .env.test
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    },
    // Последовательный запуск (избегать конфликтов)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
```

**Пример integration теста:**
```typescript
// lib/services/room.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { RoomService } from './room';
import { cleanupTestData } from '../../e2e/utils/db-helpers';

const TEST_URL = import.meta.env.VITE_SUPABASE_URL;
const TEST_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

describe('RoomService (Integration)', () => {
  const supabase = createClient(TEST_URL, TEST_ANON_KEY);
  
  beforeAll(async () => {
    // Очистка перед тестами
    await cleanupTestData();
  });
  
  afterAll(async () => {
    // Очистка после тестов
    await cleanupTestData();
  });
  
  it('создает комнату с E2E шифрованием', async () => {
    const result = await RoomService.createRoom(
      'Test Room',
      'group',
      'test-user-1',
      ['test-user-2', 'test-user-3']
    );
    
    expect(result.isOk()).toBe(true);
    expect(result.value).toHaveProperty('roomId');
    expect(result.value).toHaveProperty('roomKey');
    
    // Проверка: комната в БД
    const { data, error } = await supabase
      .from('rooms')
      .select()
      .eq('id', result.value.roomId)
      .single();
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
  
  it('добавляет участников с шифрованием ключа', async () => {
    // ... создание комнаты
    const addResult = await RoomService.addMembersToGroup(
      roomId,
      ['test-user-4'],
      roomKey,
      'test-user-1'
    );
    
    expect(addResult.isOk()).toBe(true);
    
    // Проверка: участники в БД
    const { data } = await supabase
      .from('room_members')
      .select()
      .eq('room_id', roomId);
    
    expect(data?.length).toBe(4); // 3 + 1 новый
  });
});
```

**Запуск:**
```bash
vitest run --config=vitest.integration.config.ts
```

---

### 4. Автоматический запуск сервера (WebServer)

**Статус:** ✅ Реализовано

**Конфигурация в `playwright.config.ts`:**

```typescript
export default defineConfig({
  // ... остальные настройки
  
  // WebServer для автоматического запуска приложения перед тестами
  webServer: {
    // Команда запуска сервера
    command: process.env.CI 
      ? "npm run build && npm run preview"  // CI: production сборка
      : "npm run dev",                       // Local: dev сервер
    
    // Порт приложения
    url: "http://localhost:5173",
    
    // Переиспользовать существующий сервер (не в CI)
    reuseExistingServer: !process.env.CI,
    
    // Таймаут запуска (2 минуты для dev, 5 для build)
    timeout: process.env.CI 
      ? 5 * 60 * 1000 
      : 2 * 60 * 1000,
    
    // stdout/stderr для отладки
    stdout: "pipe",
    stderr: "pipe",
    
    // Переменные окружения для сервера
    env: {
      // В CI использовать mock, если не задано иное
      VITE_USE_MOCK: process.env.VITE_USE_MOCK || "true",
    },
  },
});
```

**Преимущества:**
- ✅ Сервер запускается автоматически перед тестами
- ✅ Не нужно вручную запускать `npm run dev`
- ✅ В CI используется production сборка для точности
- ✅ Local используется dev сервер для скорости

**Запуск тестов:**
```bash
# Просто запустить тесты (сервер поднимется автоматически)
npx playwright test

# Запустить с UI (сервер тоже поднимется автоматически)
npx playwright test --ui
```

---

### 5. Очистка базы данных (Идемпотентность тестов)

**Статус:** ✅ Документировано

**Важно:** E2E тесты должны быть **идемпотентными** — повторный запуск не должен ломать тесты.

#### 5.1: Утилиты для очистки БД

Создать файл `e2e/utils/db-helpers.ts`:

```typescript
// e2e/utils/db-helpers.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Требуется service role key
);

const TEST_PREFIX = 'test-';

/**
 * Очистка тестовых данных из БД
 * Используется в beforeAll/afterAll хуках
 */
export async function cleanupTestData() {
  try {
    // Удаляем тестовые сообщения
    await supabase
      .from('messages')
      .delete()
      .like('id', `${TEST_PREFIX}%`);

    // Удаляем тестовые комнаты
    await supabase
      .from('rooms')
      .delete()
      .like('id', `${TEST_PREFIX}%`);

    // Удаляем тестовых пользователей
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .like('username', `${TEST_PREFIX}%`);

    for (const user of users || []) {
      await supabase.auth.admin.deleteUser(user.id);
    }
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

/**
 * Очистка конкретной таблицы
 */
export async function cleanupTable(table: string, idColumn: string = 'id') {
  await supabase
    .from(table)
    .delete()
    .like(idColumn, `${TEST_PREFIX}%`);
}

/**
 * Получить список всех тестовых записей
 */
export async function getTestRecords(table: string) {
  const { data } = await supabase
    .from(table)
    .select('*')
    .like('id', `${TEST_PREFIX}%`);
  
  return data || [];
}
```

#### 5.2: Использование в тестах

**Вариант A: Очистка перед каждым тестом (рекомендуется)**

```typescript
// e2e/specs/chat.spec.ts
import { test, expect } from '@playwright/test';
import { cleanupTestData } from '../utils/db-helpers';

test.beforeEach(async () => {
  // Очистка перед каждым тестом
  await cleanupTestData();
});

test('should create a new chat', async ({ page }) => {
  // Тест чисто изолирован
});
```

**Вариант B: Очистка в начале/конце файла тестов**

```typescript
// e2e/specs/auth.spec.ts
import { test, expect } from '@playwright/test';
import { cleanupTestData } from '../utils/db-helpers';

test.beforeAll(async () => {
  // Очистка перед всеми тестами в файле
  await cleanupTestData();
});

test.afterAll(async () => {
  // Финальная очистка
  await cleanupTestData();
});

test('should register a new user', async ({ page }) => {
  // Тесты
});
```

**Вариант C: Глобальная очистка (fixtures)**

```typescript
// e2e/fixtures/cleanup.ts
import { test as base } from '@playwright/test';
import { cleanupTestData } from '../utils/db-helpers';

export const test = base.extend<{ cleanup: void }>({
  cleanup: [
    async ({}, use) => {
      // Перед использованием
      await cleanupTestData();
      await use();
      // После использования
      await cleanupTestData();
    },
    { auto: true }  // Автоматически для всех тестов
  ],
});
```

#### 5.3: Best Practices

| Практика | Описание |
|----------|----------|
| **Префикс тестовых данных** | Все тестовые записи должны иметь префикс `test-` |
| **Очистка перед тестом** | `beforeEach` для полной изоляции |
| **Очистка после теста** | `afterEach` если тест создаёт много данных |
| **Глобальная очистка** | `beforeAll`/`afterAll` для группы тестов |
| **Логирование** | Выводить в консоль что очищено |
| **Обработка ошибок** | Не падать если данных нет |

---

### 6. Фикстуры и хелперы

**Статус:** ❌ Не реализовано  
**Приоритет:** 🟡 Высокий

**Структура:**
```typescript
// e2e/fixtures/test-users.ts
import { test as base } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const test = base.extend<{
  testUser: { email: string; password: string; id: string };
}>({
  testUser: async ({ page }, use) => {
    // Создаем пользователя
    const email = `test+${Date.now()}@knock-knock.test`;
    const password = 'Test123!';
    
    const { data } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    
    const userId = data?.user?.id!;
    
    await use({ email, password, id: userId });
    
    // Очищаем после теста
    await supabase.auth.admin.deleteUser(userId);
  },
});

export { expect } from '@playwright/test';
```

```typescript
// e2e/fixtures/auth-fixture.ts
import { Page } from '@playwright/test';

export async function loginAsUser(
  page: Page,
  email: string,
  password: string
) {
  await page.goto('/login');
  
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  
  await page.waitForURL('/chat');
  await page.waitForSelector('[data-testid="chat-list"]');
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout"]');
  await page.waitForURL('/login');
}
```

```typescript
// e2e/utils/db-helpers.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function cleanupTestData() {
  const TEST_PREFIX = 'test-';
  
  // Удаляем тестовые сообщения
  await supabase
    .from('messages')
    .delete()
    .like('id', `${TEST_PREFIX}%`);
  
  // Удаляем тестовые комнаты
  await supabase
    .from('rooms')
    .delete()
    .like('id', `${TEST_PREFIX}%`);
  
  // Удаляем тестовых пользователей
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .like('username', `${TEST_PREFIX}%`);
  
  for (const user of users || []) {
    await supabase.auth.admin.deleteUser(user.id);
  }
}
```

---

### 6. CI/CD интеграция

**Статус:** ❌ Не реализовано  
**Приоритет:** 🟢 Средний

**Workflow:**
```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      # Test Supabase через Docker
      supabase:
        image: supabase/postgres:15.1.0.117
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 54322:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Start Supabase
        run: |
          npx supabase init
          npx supabase start
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}
      
      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: e2e-report/
```

---

### 7. Очистка и изоляция тестов

**Статус:** ❌ Не реализовано  
**Приоритет:** 🟡 Высокий

**Стратегии:**

**A. Уникальные префиксы:**
```typescript
const TEST_PREFIX = `test-${Date.now()}-`;
const TEST_USER_EMAIL = `${TEST_PREFIX}user@test.knock-knock.test`;
```

**B. Хуки очистки:**
```typescript
// e2e/fixtures/cleanup.ts
export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page);
    // После каждого теста
    await cleanupTestData();
  },
});
```

**C. Транзакции (для integration тестов):**
```typescript
// Begin transaction before each test
beforeEach(async () => {
  await supabase.rpc('begin_test_transaction');
});

// Rollback after each test
afterEach(async () => {
  await supabase.rpc('rollback_test_transaction');
});
```

---

## 📋 Чек-лист реализации

###已完成 (Done)
- [x] Vitest настроен и работает
- [x] 19 test-файлов с unit-тестами
- [x] Mock-клиент Supabase полностью функционален
- [x] Storybook установлен
- [x] Playwright установлен
- [x] Seed-скрипт для наполнения БД

### В процессе (In Progress)
- [ ] Разделение .env файлов
- [ ] Настройка Staging Supabase
- [ ] E2E тесты (Playwright)
- [ ] Integration тесты (Vitest)

### Запланировано (Planned)
- [ ] Фикстуры и хелперы
- [ ] CI/CD интеграция
- [ ] Отчеты о покрытии
- [ ] Документация для разработчиков

---

## 🚀 Быстрый старт

### Для разработчиков

**1. Unit-тесты (локально):**
```bash
cd app
npm run test
```

**2. Storybook (разработка UI):**
```bash
npm run storybook
```

**3. E2E тесты (требуется Staging):**
```bash
# 1. Переключиться на staging
./scripts/use-env.sh staging

# 2. Запустить приложение
npm run dev

# 3. Запустить тесты в другом терминале
npx playwright test
```

### Для CI/CD

```bash
# Все тесты
npm run test:unit && npm run test:e2e

# С покрытием
npm run test:coverage
```

---

## 📚 Дополнительные ресурсы

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)

---

## ⚠️ Важные замечания

1. **Никогда не запускайте E2E тесты на Production** — используйте только Staging или Mock
2. **Всегда очищайте тестовые данные** после запуска тестов
3. **Не коммитьте `.env.*` файлы** (кроме `.env.example`)
4. **Используйте уникальные префиксы** для тестовых данных (`test-<timestamp>-`)
5. **Service Role Key держите в секрете** — только для серверных скриптов
