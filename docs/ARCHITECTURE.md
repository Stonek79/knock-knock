# Архитектура проекта Knock-Knock

Этот документ описывает архитектурные стандарты, структуру проекта и правила, обязательные для соблюдения всеми разработчиками.

---

## 🏗 Общие принципы

1.  **Mobile First**: Весь интерфейс проектируется и верстается в первую очередь под мобильные устройства. Desktop — это расширение (адаптивная версия).
2.  **Offline First**: Приложение должно сохранять работоспособность без интернета. Кеширование данных (TanStack Query) и оптимистичные обновления обязательны.
3.  **Secure by Design**: E2E шифрование не опция, а база. Приватные ключи пользователя никогда не покидают устройство.
4.  **Zero Knowledge**: Сервер (PocketBase) хранит только зашифрованные блобы и метаданные. Никаких открытых сообщений в БД.
5.  **Backend-Driven Entities**: Критически важные системные сущности (например, комната "Избранное") создаются на стороне сервера через хуки, гарантируя целостность данных.
6.  **Isolated Handlers Pattern**: Использование двойного импорта (`require`) для обеспечения стабильности JavaScript хуков в изолированных контекстах PocketBase v0.23+.
7.  **Web Core as Source of Truth**: Основная разработка ведется как Web/PWA. Нативные приложения (Android/Desktop) являются обертками (Wrappers) над веб-ядром.

---

## 🛠 Технологический стек

| Слой | Технологии |
|------|------------|
| **Frontend** | React 19, TypeScript, Vite |
| **Routing** | TanStack Router (File-based routing) |
| **Storage (Offline)** | **Dexie.js** (IndexedDB) — для кэширования медиа и оффлайн-режима |
| **Media Processing** | **WebCodecs API**, **mp4-muxer**, **OffscreenCanvas** (в Web Workers) |
| **State (Server)** | TanStack Query (v5) |
| **State (Global)** | Zustand |
| **UI Kit** | Radix UI Primitives (Headless) + наши обёртки |
| **Styling** | CSS Modules + Vanilla CSS (Variables) |
| **Backend** | PocketBase v0.23+ (Auth, SQLite, Realtime SSE, JS Hooks) |
| **Background Tasks** | **Task Runner** (SQLite-based queue + Cron Hooks) |
| **Crypto** | Web Crypto API (SubtleCrypto: ECDH-ES, AES-GCM) |
| **Линтинг** | Biome (lint + format) |

---

## 📂 Структура проекта (Feature-Driven Architecture)

...

## 🔄 Фоновые задачи (Task Runner)

Для выполнения тяжелых или отложенных операций (Push-уведомления, очистка старых файлов, агрегация данных) используется кастомный Task Runner на стороне PocketBase:
1.  **Очередь задач**: Коллекция `task_queue` хранит тип задачи, полезную нагрузку (payload) и статус.
2.  **Cron Hooks**: JS-хук в `pb_hooks` просыпается по расписанию, выбирает новые задачи и выполняет их порциями.
3.  **Retry Logic**: Механизм повторов при сбоях (экспоненциальная задержка).

## 🌍 Offline First и Кэширование

Приложение должно сохранять работоспособность без интернета:
1.  **Сообщения**: TanStack Query кеширует данные в памяти.
2.  **Медиа**: Все зашифрованные файлы сохраняются в **Dexie.js** (IndexedDB). При повторном просмотре файлы берутся из локальной БД, а не скачиваются заново.
3.  **Оптимистичные обновления**: UI меняется мгновенно, данные синхронизируются в фоне.

Проект организован по функциональным доменам (Features), а не по типу файлов. Мы используем прагматичный подход (Feature-Driven Architecture), а не строгий FSD, чтобы избежать излишней фрагментации.

```
app/src/
├── features/           # 🟢 БИЗНЕС-ЛОГИКА (Домены)
│   ├── admin/          # Панель администратора
│   ├── auth/           # Формы входа, регистрации
│   ├── calls/          # Звонки (UI и логика WebRTC)
│   ├── chat/           # Чаты. Внутри разбиты на домены
│   ├── contacts/       # Управление контактами
│   ├── favorites/      # Избранное (сохраненные сообщения)
│   ├── navigation/     # Глобальная навигация
│   ├── presence/       # Статус пользователей (в сети)
│   ├── profile/        # Управление профилем
│   └── settings/       # Настройки приложения
│
├── layouts/            # 🟡 СТРУКТУРА СТРАНИЦ
│   ├── AppLayout/      # Основной UI (сайдбар + контент)
│   ├── AuthLayout/     # Лейаут авторизации
│   ├── RootLayout/     # Глобальный провайдер
│   └── SettingsRouteLayout/ # Лейаут настроек
│
├── pages/              # 🔴 ТОЧКИ ВХОДА (Маршруты)
│   ├── LandingPage/    # Главная публичная
│   ├── LoginPage/      # Страница входа
│   └── ...             # Страницы собирают features и layouts
│
├── components/         # ⚪️ UI KIT (Глупые компоненты)
│   ├── ui/             # Атомы: Button, AppLogo, Alert
│   └── ...
│
├── lib/                # ⚫️ ЯДРО (Core)
│   ├── constants/      # Константы (Runtime: темы, роли, MIME-типы)
│   ├── types/          # Типы (Compile-time)
│   ├── crypto/         # Криптография (Web Crypto API)
│   ├── schemas/        # Zod-схемы валидации
│   └── repositories/   # Слой доступа к PocketBase API
│
├── hooks/              # Глобальные хуки (useMediaQuery, useTheme)
├── stores/             # Глобальные Zustand сторы (auth, theme)
└── locales/            # i18n JSON файлы (RU/EN)
```

## Доменная модель чатов

| Тип | URL | Описание |
|-----|-----|----------|
| **Публичный DM** | `/chat/:roomId` | 1-на-1 чат, история сохраняется в БД |
| **Приватный чат** | `/private/:roomId` | 1-на-1 эфемерный чат, история удаляется при закрытии |
| **Группа** | `/chat/:roomId` | Групповой чат, множество участников |
| **Избранное** | `/favorites/:roomId` | Сохраненные сообщения (Self-chat) |
| **DM-инициализатор** | `/dm/:userId` и `/_auth/dm/:userId` | Redirect-роут: находит/создаёт комнату и редиректит |

---

## Целевая структура

```
routes/
├── __root.tsx                    # RootLayout (минимальный: init, ghost, dev banner)
├── index.tsx                     # / — IndexPage (landing или redirect)
├── login.tsx                     # /login — LoginPage
│
├── _auth.tsx                     # AuthLayout — проверка авторизации
├── _auth/
│   ├── chat.tsx                  # ChatLayout — Outlet + sidebar context
│   ├── chat/
│   │   ├── index.tsx             # /chat — ChatIndexPage
│   │   └── $roomId.tsx           # /chat/:roomId — ChatRoomPage
│   │
│   ├── private.tsx               # PrivateLayout — Outlet + sidebar context
│   ├── private/
│   │   ├── index.tsx             # /private — PrivateChatPage
│   │   └── $roomId.tsx           # /private/:roomId — PrivateRoomPage
│   │
│   ├── dm.$userId.tsx            # /dm/:userId — DMInitializer
│   ├── contacts.tsx              # /contacts — ContactsPage
│   ├── calls.tsx                 # /calls — CallsPage
│   ├── favorites.tsx             # /favorites — FavoritesPage
│   ├── profile.tsx               # /profile — ProfilePage
│   │
│   ├── settings.tsx              # SettingsLayout
│   ├── settings/
│   │   ├── index.tsx             # /settings — SettingsIndexPage
│   │   ├── account.tsx
│   │   ├── appearance.tsx
│   │   ├── privacy.tsx
│   │   ├── notifications.tsx
│   │   └── security.tsx
│   │
│   ├── admin.tsx                 # AdminLayout
│   └── admin/
│       ├── index.tsx             # /admin — AdminDashboard
│       └── users.tsx             # /admin/users — UserList
```


### Правила слоев (Feature-Driven Architecture):
1.  **Pages** могут импортировать **Features**, **Layouts** и **Components**.
2.  **Features** инкапсулируют внутри себя всё необходимое (хуки, компоненты под-домена). Для сложных фичей (как `chat`) применяется внутреннее разбиение на модули (`modules/Message`, `modules/ChatRoom`), где каждый модуль хранит свои хуки и UI рядом.
3.  **Features** могут импортировать **Components** и глобальные **Hooks**. Фичи не должны зависеть друг от друга (Sibling Imports запрещены).
4.  **Layouts** управляют расположением **Features** на странице.
5.  **Lib** — это ядро, без зависимостей от React (по возможности).

---

## 🧠 Управление состоянием

### 1. Server State (TanStack Query) — *Предпочтительно*
Всё, что приходит из БД (чаты, сообщения, профиль), должно управляться через TanStack Query.
- **Кеширование**: Используй ключи `['rooms', userId]`.
- **Инвалидация**: После мутаций (sendMessage) инвалидируй связанные квери.

### 2. Global Client State (Zustand)
Только для данных, которые нужны всему приложению и не хранятся в БД:
- `useAuthStore` (текущий юзер, сессия).
- `useThemeStore` (тема оформления).
- `useCallStore` (состояние активного звонка).

### 3. Local State (useState)
Для UI-состояний компонента (открыт модалка, значение инпута, hover).
Не выноси это в global store!

---

## 📐 Типы и Константы

Чёткое разделение между Runtime значениями и Compile-time типами.

### 1. Константы (`lib/constants/`)
Только объекты `as const`. Файлы должны быть "лёгкими". **Избегайте "магических строк" (magic strings) и чисел напрямую в коде.** Обязательно выносите любые хардкод значения (имена бакетов, типы MIME, роли пользователей и т.д.) в константы.

#### Пример константы темы (`lib/constants/theme.ts`)

```typescript
// Утверждённые темы проекта
export const DESIGN_THEME = {
    DEFAULT:  'default',   // WA-inspired, по умолчанию
    NEON:     'neon',      // Cyberpunk/Glassmorphism
    EMERALD:  'emerald',   // VIP/Gold
} as const;

export type DesignTheme = typeof DESIGN_THEME[keyof typeof DESIGN_THEME];
```

### 2. Типы (`lib/types/`)
Интерфейсы, алиасы и типы, выведенные из Zod-схем или констант.

**Важно:** Типы для сущностей БД выводятся из **Zod-схем** (`z.infer<typeof schema>`), расположенных в `src/lib/schemas/`. *Запрещено* ручное приведение типов (`as unknown as Role`). Вместо этого — Type Guards или `satisfies`.

```typescript
// lib/schemas/auth.ts
import { z } from 'zod';

export const loginSchema = z.object({
    email:    z.string().email(),
    password: z.string().min(8),
});

export type LoginPayload = z.infer<typeof loginSchema>;
```

### 3. Barrel Exports
Каждая папка в `lib/types` и `lib/constants` должна иметь `index.ts` для удобного импорта:
```typescript
import { CHAT_TYPE } from '@/lib/constants';
import type { ChatType } from '@/lib/types';
```

---

## 🎨 UI/UX Стандарты

1. **Radix Headless**: Используй наши компоненты-обёртки из `@/components/ui` (`<Button>`, `<Avatar>`, `<Dialog>`). Прямой импорт Radix-примитивов в `features/` и `pages/` запрещён.
2. **CSS Modules**: Кастомизация только через `Component.module.css`.
3. **Inline Styles ЗАПРЕЩЕНЫ**: `style={{ margin: 10 }}` — под запретом. Только `className`.
4. **Иконки**: Только `lucide-react`.
5. **Темы**: `default` (WA-inspired, по умолчанию) / `neon` / `emerald`. Подробнее: `docs/DESIGN.md` и `docs/DESIGN_SYSTEM_PLAN.md`.

---

## 🔐 Безопасность и защита от угроз API (Security Guidelines)

Архитектура безопасности базируется на выявлении и предотвращении общих уязвимостей (OWASP API Security Top 10):

1. **Broken Object Level Authorization (BOLA) & Access Control**: 
   - Всегда проверяйте права доступа на уровне БД. В PocketBase для этого используются **API Rules** (фильтры).
   - Пользователь имеет право на чтение/запись только тех строк, где его `id` или `user_id` соответствует правилам коллекции.
2. **Rate Limiting (Защита от DDoS и Brute-Force)**:
   - Блокировка частых действий на сервере. В PocketBase настроено ограничение частоты запросов.
3. **Input Validation & Injection Prevention**: 
   - Любые данные от пользователя считаются потенциально опасными. Избегайте `dangerouslySetInnerHTML`. 
   - Используйте типизацию (TypeScript) для валидации всех входных параметров. 
   - PocketBase автоматически защищает от SQL-инъекций через использование подготовленных выражений в драйвере SQLite.
4. **Data Exposure (Избыточное раскрытие данных)**: 
   - В запросах API всегда выключайте публичный доступ к чувствительным полям. Никакие секретные данные (хеши, ключи) не должны "утекать" на клиент.
5. **Server-Side Hooks (Atomic Operations)**:
   - Использование **JS VM Hooks** для атомарных операций: создание системных комнат при регистрации и полная очистка данных (Cascade Delete) при удалении пользователя.
6. **Security Headers & Транспорт**: 
   - **HTTPS Everywhere**: Доступ к приложению и API исключительно по TLS.
   - Обязательно настраиваются заголовки `Content-Security-Policy (CSP)`, `X-Content-Type-Options`, `X-Frame-Options` для защиты от XSS и Clickjacking.
6. **E2E Криптография (Основа приватности)**: 
   - Secret Keys: Приватный ключ (`cryptoKey`) **никогда** не должен покидать клиент (браузер). 
   - Storage: Ключи хранятся в `IndexedDB` (не LocalStorage) с параметром `non-extractable`.

---

## 🛡 Security Testing
Регулярно (перед крупными релизами) проводить проверку на:
- **XSS & Validation**: Попытка инъекции скриптов, XSS payload-текстов в сообщения и формы профиля.
- **BOLA Bypass**: Попытка прочитать/изменить или удалить чужие сообщения посредством прямой подмены `message_id` или `room_id` в запросах к PocketBase.
- **Brute-Force**: Проверка блокировки после N попыток входа.
- **Dependency Audit**: `npm audit` на известные уязвимости (CVE).

---

## 🔄 Правила разработки (Workflow)

1.  **Линтинг**: `npm run lint` и `npx tsc --noEmit` должны проходить перед каждым коммитом.
2.  **Импорты**: Используй алиас `@/` (напр. `@/features/chat`). Относительные пути (`../../`) допустимы только внутри одной фичи.
3.  **Язык**: Код, комментарии и коммиты — на **русском** или **английском** (но консистентно). Текущий стандарт — комментарии RU.

---

## 🛠 Стандарты PocketBase Hooks (v0.23+)

Из-за специфики среды выполнения PocketBase (изоляция обработчиков), необходимо соблюдать паттерн **"Double Require"**:

1.  **Top-level Require**: Импорт `db.js` в начале файла необходим, если константы используются в параметрах регистрации (например, в `cronAdd` или `onRecord...`).
2.  **Internal Require**: Каждая функция-обработчик или колбэк ДОЛЖНЫ содержать свой `require(`${__hooks}/db.js`)`, так как внешние переменные из глобальной области видимости затираются или становятся недоступны при вызове обработчика.

```javascript
// ✅ Правильно:
const DB_TOP = require(`${__hooks}/db.js`);

cronAdd("task", DB_TOP.CONFIG.CRON, () => {
    const DB = require(`${__hooks}/db.js`); // Внутренний импорт
    // ... логика
});
```
