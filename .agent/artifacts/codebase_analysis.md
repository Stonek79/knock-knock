# Анализ кодовой базы проекта Knock-Knock (PrivMessenger)

Этот документ представляет собой сводный анализ архитектуры, структуры и стандартов разработки проекта Knock-Knock, выполненный для получения глубокого контекста перед началом доработок.

---

## 1. Общее описание проекта
**Knock-Knock (PrivMessenger)** — это прогрессивное веб-приложение (PWA) для безопасного обмена сообщениями, поддерживающее режим невидимки (Ghost Mode) и сквозные WebRTC-звонки.

### Основные концепции:
- **Offline First**: Высокая степень автономности. Приложение кэширует сообщения в оперативной памяти (TanStack Query), а медиафайлы — в локальной базе данных IndexedDB ([Dexie.js](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/mediadb)).
- **Secure by Design / Zero Knowledge**: Все сообщения шифруются на стороне клиента с использованием [Web Crypto API](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/crypto). Сервер (PocketBase) оперирует исключительно зашифрованными блобами и метаданными, не имея доступа к исходному тексту сообщений. Приватные ключи генерируются как неэкспортируемые (`non-extractable`) и никогда не покидают устройство пользователя.
- **Self-Hosted Hybrid**: Связка VPS (Nginx, Coturn для WebRTC) и домашнего сервера с базой данных PocketBase (на базе SQLite) через зашифрованный WireGuard-туннель.

---

## 2. Технологический Стек

*   **Frontend**: React 19.2, TypeScript, Vite.
*   **Маршрутизация**: TanStack Router (файловый роутинг, декларативная структура).
*   **Стейт-менеджмент**:
    *   *Server State*: TanStack Query v5 (кэширование, инвалидация данных).
    *   *Client State*: Zustand (глобальные сторы для авторизации, тем и активных вызовов).
    *   *Local UI State*: Стандартный `useState` React.
*   **База данных (Client)**: Dexie.js (IndexedDB) для сохранения зашифрованного медиаконтента.
*   **Медиаобработка**: WebCodecs API, mp4-muxer, OffscreenCanvas в Web Workers (для работы с видео и оптимизации производительности).
*   **Криптография**: Web Crypto API (алгоритмы ECDH-ES, AES-GCM).
*   **Валидация**: Zod v4.
*   **Стилизация**: CSS Modules + Vanilla CSS-переменные (глобальные дизайн-токены в [index.css](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/index.css)).
*   **Инструменты качества**: Biome (для быстрого форматирования и линтинга вместо ESLint/Prettier).

---

## 3. Структура Репозитория

Проект имеет четкую модульную архитектуру:
- [`/infra`](file:///Users/alexstone/WebstormProjects/knock-knock/infra) — файлы конфигурации деплоя (Nginx, Coturn, WireGuard для VPS; PocketBase и Hooks для Home Server).
- [`/app`](file:///Users/alexstone/WebstormProjects/knock-knock/app) — исходный код frontend-части на React.
- [`/docs`](file:///Users/alexstone/WebstormProjects/knock-knock/docs) — исчерпывающая документация по всем аспектам системы (архитектура, безопасность, WebRTC, тестирование).
- [`/scripts`](file:///Users/alexstone/WebstormProjects/knock-knock/scripts) — утилиты для автоматизации и сидирования.

### Структура `app/src/` (Feature-Driven Architecture):
- [`features/`](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/features) — модульная бизнес-логика. Каждый домен (например, [chat](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/features/chat), `auth`, `calls`) изолирован и содержит свои хуки и интерфейсные части рядом.
- [`layouts/`](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/layouts) — структурные шаблоны страниц (`AppLayout`, `AuthLayout`, `RootLayout`).
- [`pages/`](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/pages) — точки входа, собирающие компоненты и разметку воедино.
- [`components/`](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/components) — атомарные UI-компоненты (UI Kit), построенные на базе безстилевых Radix UI Primitives.
- [`lib/`](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib) — ядро приложения. Не зависит от React-компонентов. Содержит:
  *   `crypto` (E2E-шифрование).
  *   `constants` (глобальные константы).
  *   `types` (типы TypeScript).
  *   `schemas` (Zod-схемы валидации).
  *   `repositories` (доступ к API PocketBase).
- [`routes/`](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/routes) — файлы маршрутов TanStack Router.

---

## 4. Стандарты Кодирования и Архитектурные Правила

### Качество кода и TypeScript:
1.  **Запрет `any`**: Любое явное или неявное использование типа `any` строго запрещено. Используются строгие кастомные типы или `unknown`/`never`.
2.  **React 19.2**: Использование современных паттернов. В частности, `ref` передается как обычный проп (устаревший `forwardRef` не используется). Предпочтение отдается новым хукам React 19 (например, `useOptimistic`, `useActionState`).
3.  **Приведение типов**: Избегать небезопасного кастования `as Type`. Предпочтение отдается Type Guards, механизму `satisfies` или генерации типов через схемы Zod (`z.infer<typeof schema>`).
4.  **Синтаксис условий**: Все `return` внутри условных блоков `if` должны быть обернуты в фигурные скобки. Однострочные записи вида `if (...) return;` запрещены.

### UI/UX и Дизайн-система (Premium Glassmorphism):
1.  **Mobile First**: Дизайн изначально проектируется для мобильных устройств, десктоп — лишь адаптивное расширение.
2.  **Стилизация**: Никаких инлайн-стилей. Верстка строится на Radix UI + CSS Modules. CSS Layers (`@layer`) под запретом во избежание конфликтов специфичности стилей.
3.  **Токены**: Стили должны строго переиспользовать переменные из [index.css](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/index.css) (цвета, отступы, шрифты).
4.  **Интернационализация (i18n)**: UI не содержит захардкоженного текста. Весь контент выносится в локали [locales/](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/locales) и получается через хук `useTranslation()`.
5.  **Темы**: Поддерживаются три премиальные темы:
    *   `default`: Светлая/Темная (WA-inspired, лаконичный стиль).
    *   `neon`: Cosmic Cyberpunk (размытие, яркие неоновые акценты).
    *   `emerald`: Forest Gold Luxury (изумрудные и золотые тона, тонкие рамки).

### Безопасность и PocketBase API:
1.  **Broken Object Level Authorization (BOLA)**: Проверка прав доступа выполняется на стороне СУБД с помощью API Rules.
2.  **PocketBase VM Hooks (Double Require)**: Специфика JS VM в PocketBase требует импортировать зависимости (например, `db.js`) как в глобальной области видимости хука (для регистрации колбэков), так и непосредственно внутри функций-обработчиков, так как контекст вызова изолирован.

---

## 5. Тестирование и Проверки
- **Статический анализ**: Запуск форматирования и линтинга производится с помощью Biome (`npm run lint` / `npx biome check --write`).
- **Тесты**:
  *   *Unit-тесты* базируются на Vitest (`npm run test`).
  *   *E2E-тесты* реализованы с помощью Playwright (`npx playwright test`).

---

## Вывод
Проект обладает современной, зрелой и хорошо задокументированной кодовой базой с четким разделением ответственности (Separation of Concerns). Строгие правила разработки (отсутствие `any`, обязательные фигурные скобки для `if/return`, i18n, Mobile First) гарантируют чистоту и масштабируемость архитектуры.

Контекст успешно получен, кодовая база готова к дальнейшей разработке и реализации новых функций.
