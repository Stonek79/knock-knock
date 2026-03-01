# Архитектура проекта Knock-Knock

Этот документ описывает архитектурные стандарты, структуру проекта и правила, обязательные для соблюдения всеми разработчиками.

---

## 🏗 Общие принципы

1.  **Mobile First**: Весь интерфейс проектируется и верстается в первую очередь под мобильные устройства. Desktop — это расширение (адаптивная версия).
2.  **Offline First**: Приложение должно сохранять работоспособность без интернета. Кеширование данных (TanStack Query) и оптимистичные обновления обязательны.
3.  **Secure by Design**: E2E шифрование не опция, а база. Приватные ключи пользователя никогда не покидают устройство.
4.  **Zero Knowledge**: Сервер (Supabase) хранит только зашифрованные блобы и метаданные. Никаких открытых сообщений в БД.
5.  **Web Core as Source of Truth**: Основная разработка ведется как Web/PWA. Нативные приложения (Android/Desktop) являются обертками (Wrappers) над веб-ядром.

---

## 🛠 Технологический стек

| Слой | Технологии |
|------|------------|
| **Frontend** | React 19, TypeScript, Vite |
| **Routing** | TanStack Router (File-based routing) |
| **State (Server)** | TanStack Query (v5) |
| **State (Global)** | Zustand |
| **UI Kit** | Radix UI Themes (Primitive-based) |
| **Styling** | CSS Modules + Vanilla CSS (Variables) |
| **Icons** | Lucide React |
| **Backend** | Supabase (Auth, Postgres, Realtime) |
| **Crypto** | Web Crypto API (SubtleCrypto: ECDH-ES, AES-GCM) |
| **Wrappers** | Capacitor (Mobile), Tauri (Desktop) — *Planned* |

---

## 📂 Структура проекта (Feature-Driven Architecture)

Проект организован по функциональным доменам (Features), а не по типу файлов. Мы используем прагматичный подход (Feature-Driven Architecture), а не строгий FSD, чтобы избежать излишней фрагментации.

```
app/src/
├── features/           # 🟢 БИЗНЕС-ЛОГИКА (Домены)
│   ├── chat/           # Сложная фича. Внутри разбита на sub-domains (modules/Message, modules/ChatList)
│   ├── calls/          # Звонки (UI и логика WebRTC)
│   ├── auth/           # Формы входа, регистрации
│   ├── profile/        # Управление профилем и безопасностью (ключи)
│   └── settings/       # Настройки приложения
│
├── layouts/            # 🟡 СТРУКТУРА СТРАНИЦ
│   ├── RootLayout/     # Глобальный провайдер и лейаут
│   ├── DesktopLayout/  # Двухколоночный вид (Sidebar + Content)
│   ├── MobileHeader/   # Шапка для мобилок
│   └── BottomNav/      # Навигация
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
│   ├── constants/      # Константы (Runtime)
│   ├── types/          # Типы (Compile-time)
│   ├── crypto/         # Криптография
│   └── supabase.ts     # Клиент БД
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

```typescript
// lib/constants/theme.ts
export const RADIX_THEME = {
    [DESIGN_THEME.EMERALD]: {
        ACCENT: "gold",
        GRAY: "olive",
    },
    [DESIGN_THEME.NEON]: {
        ACCENT: "teal",
        GRAY: "slate",
    },
    DEFAULT_RADIUS: "medium",
} as const;
```

### 2. Типы (`lib/types/`)
Интерфейсы, алиасы и типы, выведенные из констант.

```typescript
// lib/types/chat.ts
import { CHAT_TYPE } from '@/lib/constants';

export type ChatType = typeof CHAT_TYPE[keyof typeof CHAT_TYPE];
```

### 3. Barrel Exports
Каждая папка в `lib/types` и `lib/constants` должна иметь `index.ts` для удобного импорта:
```typescript
import { CHAT_TYPE } from '@/lib/constants';
import type { ChatType } from '@/lib/types';
```

---

## 🎨 UI/UX Стандарты

1.  **Radix Base**: Используй кастомизированные компоненты Radix (`<Flex>`, `<Box>`, `<Text>`) для верстки. Не пиши `div` с классами для лейаута.
2.  **CSS Modules**: Если нужно кастомизировать стиль, создай `Component.module.css`.
3.  **Inline Styles ЗАПРЕЩЕНЫ**: `style={{ margin: 10 }}` — под запретом.
4.  **Иконки**: Только `lucide-react`.

---

## 🔐 Безопасность и защита от угроз API (Security Guidelines)

Архитектура безопасности базируется на выявлении и предотвращении общих уязвимостей (OWASP API Security Top 10):

1. **Broken Object Level Authorization (BOLA) & Access Control**: 
   - Всегда проверяйте права доступа на уровне БД. В Supabase для этого строго используются **RLS (Row Level Security)** политики.
   - Пользователь имеет право на чтение/запись только тех строк, где его `user_id` присутствует в `room_members`.
2. **Rate Limiting (Защита от DDoS и Brute-Force)**:
   - Блокировка частых действий на сервере/шлюзе (не только на клиенте). Настроено ограничение частоты запросов к критичным эндпоинтам (например, авторизация, отправка сообщений).
3. **Input Validation & Injection Prevention**: 
   - Любые данные от пользователя считаются потенциально опасными. Избегайте `dangerouslySetInnerHTML`. 
   - Используйте типизацию (Zod/TypeScript) для валидации всех входных параметров перед отправкой в БД/отрисовкой. 
   - Supabase PostgREST автоматически защищает от SQL-инъекций, но RPC-функции должны писаться с использованием параметризованных запросов.
4. **Data Exposure (Избыточное раскрытие данных)**: 
   - В запросах `supabase.from().select(...)` всегда указывайте точный список колонок вместо `*`. Никакие секретные данные (хеши, ключи) не должны "утекать" на клиент даже транзитом.
5. **Security Headers & Транспорт**: 
   - **HTTPS Everywhere**: Доступ к приложению и API исключительно по TLS.
   - Обязательно настраиваются заголовки `Content-Security-Policy (CSP)`, `X-Content-Type-Options`, `X-Frame-Options` для защиты от XSS и Clickjacking.
6. **E2E Криптография (Основа приватности)**: 
   - Secret Keys: Приватный ключ (`cryptoKey`) **никогда** не должен покидать клиент (браузер). 
   - Storage: Ключи хранятся в `IndexedDB` (не LocalStorage) с параметром `non-extractable`.

---

## 🛡 Security Testing
Регулярно (перед крупными релизами) проводить проверку на:
-   **XSS & Validation**: Попытка инъекции скриптов, XSS payload-текстов в сообщения и формы профиля.
-   **BOLA Bypass**: Попытка прочитать/изменить или удалить чужие сообщения посредством прямой подмены `message_id` или `room_id` в запросах к Supabase.
-   **Brute-Force**: Проверка блокировки после N попыток входа и лимитирования отправки спам-сообщений.
-   **Dependency Audit**: Анализ фронтенда и Serverless-функций `npm audit` на известные уязвимости (CVE).

---

## 🔄 Правила разработки (Workflow)

1.  **Линтинг**: `npm run lint` и `npx tsc --noEmit` должны проходить перед каждым коммитом.
2.  **Импорты**: Используй алиас `@/` (напр. `@/features/chat`). Относительные пути (`../../`) допустимы только внутри одной фичи.
3.  **Язык**: Код, комментарии и коммиты — на **русском** или **английском** (но консистентно). Текущий стандарт — комментарии RU.
