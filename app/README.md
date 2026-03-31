# Knock-Knock: Frontend App

Мессенджер с фокусом на приватность и сквозное шифрование (E2EE), построенный на React 19, PocketBase и Web Crypto API.

---

## 🚀 Технологический стек

- **Core**: React 19 + TypeScript.
- **Routing**: TanStack Router (File-based).
- **State**: Zustand + TanStack Query.
- **Backend**: PocketBase v0.23+.
- **Crypto**: Web Crypto API (AES-GCM, ECDH).
- **Styling**: Radix UI + Vanilla CSS.
- **Testing**: Vitest, Playwright, Storybook.

---

## 🛠 Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка окружения
Создайте файл `.env.local` на основе `.env.example`:
```env
VITE_PB_URL=https://dev-api.knok-knok.ru:8443
VITE_TURNSTILE_SITE_KEY=...
```

### 3. Запуск в режиме разработки
```bash
npm run dev
```

### 4. Генерация типов PocketBase
Если схема БД обновилась, запустите:
```bash
npm run typegen:pb
```

---

## 🧪 Тестирование

- **Unit-тесты**: `npm run test`
- **E2E**: `npx playwright test`
- **Storybook**: `npm run storybook`

Для полноценного тестирования требуется запущенный локальный инстанс PocketBase или доступ к Dev-API.

---

## 📂 Структура проекта

Архитектура проекта следует принципам **Feature-Sliced Design (FSD)**:
- `src/features`: Модульные блоки функционала (чат, аут, настройки).
- `src/lib/repositories`: Слой доступа к данным (абстракция над SDK).
- `src/lib/services`: Бизнес-логика и оркестрация репозиториев.
- `src/hooks`: Переиспользуемые React-хуки.
- `src/components`: Общие UI-компоненты.
