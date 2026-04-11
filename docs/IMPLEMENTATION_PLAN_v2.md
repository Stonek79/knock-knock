# Глобальный план развития Knock-Knock

> **Стратегия «Foundation First»**
> **Статус:** ✅ Подтверждён

---

## Анализ текущего состояния

### ✅ Что уже реализовано и работает

- PocketBase (prod + dev в разных контейнерах) — архитектура правильная
- Слой Repository → Service → Hook → UI правильно выстроен
- Result-паттерн (`err`/`ok`) используется повсеместно
- E2E шифрование (Web Crypto API) — реализовано
- Realtime через SSE — реализован
- Ghost Mode / PIN-код — реализован
- Biome, TanStack Router, Zustand, TanStack Query — стек стабильный
- Rate Limiter (`useRateLimiter`) — уже в форме входа
- Форма входа (`LoginForm` + `useLoginForm`) — работает, вход по email/password
- Сессия сохраняется в `localStorage` через PocketBase `LocalAuthStore`
- `useAuthStore.initialize()` восстанавливает сессию при перезагрузке

### ⚠️ Обнаруженные проблемы

| # | Проблема | Приоритет |
|---|---|---|
| 1 | **`as unknown as AuthUser`** в `auth.repository.ts:84` — запрещённый каст | ✅ Исправлено |
| 2 | **`loginSchema`** — `password: z.string().min(6).optional()` — пароль optional! | ✅ Исправлено |
| 3 | **`viewRule: ""`** в схеме users — публичный доступ к профилям (уязвимость) | ✅ Исправлено |
| 4 | **Нет `registerSchema`** — форма регистрации встроена в LoginForm без отдельной схемы | ✅ Исправлено |
| 5 | **Нет `display_name`** в форме регистрации — поле есть в PB, но не запрашивается | ✅ Исправлено |
| 6 | **Нет email верификации** — PocketBase поддерживает, но не задействована | ✅ Исправлено |
| 7 | **Нет honeypot-защиты** в форме — только клиентский Rate Limiter | ✅ Исправлено |
| 8 | **SMTP не настроен** — Brevo ещё не подключён | ✅ Исправлено |
| 9 | **Нет маршрута `/auth/verify`** — некуда редиректить из письма верификации | ✅ Исправлено |
| 10 | **Нет страницы `/terms`** и чекбокса принятия правил | 🟢 Нормально |
| 11 | **Silent Refresh не реализован** — токен может протухнуть при длительном использовании | ✅ Исправлено |
| 12 | **WEBRTC_CALLS_IMPLEMENTATION.md** ссылается на Supabase Edge Functions (устарело) | 🟢 Нормально |
| 13 | **ROADMAP.md секция Calls** всё ещё упоминает Supabase `call_logs` | 🟢 Нормально |

---

## Принятые архитектурные решения

### Идентификация пользователя при регистрации

| Поле | Обязательно | Описание |
|---|---|---|
| `email` | ✅ | Скрыт от других, только для верификации/восстановления |
| `display_name` | ✅ (2–50 симв.) | Отображаемое имя, **не уникальное** — уже есть в схеме PB |
| `password` | ✅ (мин. 8 симв.) | Должен содержать буквы + цифры |
| `passwordConfirm` | ✅ | Совпадение проверяется на клиенте через Zod |
| `username` | ❌ | Уникальный @-никнейм — назначается **позже** в профиле |

**Итого видимых полей при регистрации: 4** (email, display_name, password, passwordConfirm).
Форму регистрации оставляем **внутри LoginPage** (переключатель tab).

### План реализации v2: Auth, SMTP, Messaging & Calls (PocketBase)

**Статус:** 🔵 В процессе (Этапы 0, 1, 2, 5.1 — ЗАВЕРШЕНЫ)
**Версия:** 2.1 (Обновлено под Media v3 и Task Runner)

### Стратегия сессии (Persistent Auth)

- PocketBase `LocalAuthStore` сохраняет JWT в `localStorage` — сессия восстанавливается при перезагрузке
- TTL токена: **30 дней** (настраивается в PocketBase Admin → Settings → Application)
- **Silent Refresh**: фоновое продление каждые 30 мин + при `visibilitychange`
- **Graceful Offline**: NetworkError при старте → не разлогиниваем, работаем из кэша
- Детали: см. `docs/AUTH_STRATEGY.md`

### Email верификация (без блокировки входа)

- При регистрации → сразу пускаем в приложение
- Показываем **ненавязчивый баннер** «Подтвердите email» (можно скрыть, флаг в localStorage)
- Ссылка из письма → `/auth/verify?token=...` → `AuthService.confirmVerification(token)`

### Защита от ботов (без CAPTCHA)

- **Honeypot-поле** `_hp` — скрытый input, бот заполняет, сервер отклоняет
- **Time-check** — форма отправлена менее чем через 2 сек после монтирования = бот
- **Rate Limiter** — уже реализован в `useRateLimiter`
- **Email верификация** — сама фильтрует ботов

### API Rules — исправление уязвимости

```json
// ТЕКУЩЕЕ (УЯЗВИМОСТЬ): viewRule: "" — публичный доступ всем включая гостей
// ИСПРАВИТЬ на:
"viewRule": "@request.auth.id != ''"
```

---

## 🎯 Порядок реализации

| # | Задача | Оценка |
|---|---|---|
| **0** | ✅ Дизайн-система — рефакторинг `index.css` + тема `default` | Завершено |
| **1** | Auth — Schema + Forms + Persistent Session | Завершено |
| **2** | SMTP / Brevo + Email верификация | Завершено |
| **3** | Push-уведомления (Web Push + PWA) | 🟠 Backend готов, клиент в процессе |
| **4** | Audio/Video Calls (LiveKit + WebRTC) | 5–7 дней |
| **5** | Видеозапись и отправка (Media v3) | 3–4 дня |
| **5.1** | ✅ Task Runner (SQLite-based) | Завершено |
| **6** | Тестирование (параллельно) | постоянно |

---

## 📋 Детальный план этапов

---

### ЭТАП 0: Дизайн-система — Тема Default (ЗАВЕРШЕНО)

> **Детальный план:** `docs/DESIGN_SYSTEM_PLAN.md`

#### Что нужно сделать и почему

**Аудит выявил 3 уровня проблем:**
- **13 undeclared переменных** используются в компонентах (`--surface`, `--border`, `--muted-foreground`, `--radius-glass`, `--space-7` и др.) — браузер молча их игнорирует, стили неправильные
- **Radix-алиасы** (`--gray-1..12`, `--accent-9..11`) — наследие удалённого `@radix-ui/themes`, используются в `pages/` без источника
- **`:root` содержит neon-dark цвета** вместо нейтральных дефолтов
- **Тема `default`** объявлена в константах, но **CSS-блок не написан**

#### 0.1 Исправление `:root`

**MODIFY** `app/src/index.css` — `:root`:
- Добавить пропущенные spacing: `--space-7` (28px), `--space-md` (алиас `--space-4`)
- Добавить пропущенные typography: `--text-4xl` (36px)
- Добавить пропущенные sizes: `--size-icon-xl` (40px), `--size-avatar-xl-temp` (алиас)
- Добавить алиасы совместимости: `--radius-glass` = `--kk-radius-glass`
- Добавить нейтральные цветовые дефолты: `--surface`, `--surface-1`, `--surface-2`, `--border`, `--muted-foreground`, `--color-info`, `--color-background`
- Добавить Radix-алиасы: `--gray-1..12`, `--accent-9..11` → через наши семантические токены

#### 0.2 Тема `default` (WA-inspired)

**MODIFY** `app/src/index.css` — добавить блок `[data-theme="default"]`:

```
Light: #f0f2f5 фон | #ffffff surface | #00a884 акцент | #d9fdd3 bubble-out | #667781 muted
Dark:  #111b21 фон | #202c33 surface | #00a884 акцент | #005c4b bubble-out | #8696a0 muted
```

#### 0.3 Обновление `neon` и `emerald` тем

Добавить в каждый блок новые переменные: `--surface`, `--surface-1`, `--surface-2`, `--border`, `--muted-foreground`, `--color-info`, `--color-background`.

#### 0.4 Theme Store и константы

**MODIFY** `app/src/stores/theme/index.ts`:
- Сменить дефолт: `DESIGN_THEME.NEON` → `DESIGN_THEME.DEFAULT`
- Сменить дефолтный mode: `dark` → `light`

**MODIFY** `app/src/lib/constants/theme.ts`:
- Добавить preview-данные для default темы

#### 0.5 Документация

- **MODIFY** `docs/DESIGN.md` — добавить разделы: тема `default`, CSS Architecture v3 (Roadmap)
- **MODIFY** `.agent/skills/front-design/SKILL.md` — обновить дефолтную тему, список approved тем

---

### ЭТАП 1: Система Auth (PocketBase) (ЗАВЕРШЕНО)

#### 1.1 ✅ Настройка API Rules в PocketBase (Завершено)

**STATUS**: Реализовано в `pb_schema.json`.
- `"viewRule": "@request.auth.id != ''"` для коллекции `users`.
- Поле `username` добавлено и проиндексировано.

#### 1.2 ✅ Исправление Type Guard и методы репозитория (Завершено)

**STATUS**: Реализовано в `auth.repository.ts`.
- Внедрен `isUserRecord` type guard.
- Добавлены методы `requestVerification` и `confirmVerification`.

#### 1.3 ✅ Zod-схемы и типы (Завершено)

**STATUS**: Реализовано в `lib/schemas/auth.ts`.
- `loginSchema` и `registerFieldsSchema` (наш аналог `registerSchema`) готовы.
- Типы `LoginFormData` и `RegisterFormData` доступны.

#### 1.4 ✅ Компоненты форм и Honeypot (Завершено)

**STATUS**: Реализовано в `RegisterForm`, `LoginForm`, `useAuthForms`.
- Honeypot `username_bot` внедрен и проверяется.
- Логика регистрации (register -> login -> updateProfile) работает через хуки.

#### 1.5 ✅ Silent Token Refresh (Завершено)

**STATUS**: Реализовано реактивно в `AuthStore`.
- Сессия обновляется через `AuthService.onChange` и при инициализации.
- Исключены утечки памяти (без `setInterval`).

#### 1.6 ✅ Verification Banner (Завершено)

**STATUS**: Реализовано в `app/src/features/auth/components/VerificationBanner/`.
- Выводит баннер для неверифицированных пользователей с поддержкой Dismiss.

#### 1.7 ✅ Логика верификации (Завершено)

**STATUS**: Реализовано в `app/src/routes/auth.verify.tsx` и `VerifyPage`.
- Прямой роут для ссылок подтверждения.
- Получение токена из параметров URL.
- Вызов `AuthService.confirmVerification(token)`.
- Автоматическое обновление профиля при успехе.

#### 1.8 ✅ Terms Route (Завершено)

**STATUS**: Реализовано в `app/src/routes/terms.tsx` и `TermsPage`.
- Публичный маршрут для правил проекта.
- Контент адаптирован под Mobile First.

#### 1.9 ✅ Onboarding Modal (Завершено)

**STATUS**: Реализовано в `app/src/features/auth/components/OnboardingModal`.
- Модальное окно после регистрации.
- Поля для настройки профиля (display_name, username).
- Интеграция с `AppLayout`.

---

### ЭТАП 2: SMTP и Bot Protection (ЗАВЕРШЕНО)

**Описание архитектуры:** `docs/AUTH_STRATEGY.md` → раздел «Email верификация»

**STATUS**: Реализовано.
- Инфраструктура: Brevo (Prod) и Mailpit (Dev) настроены.
- Docker: Сеть `pb_network` объединяет контейнеры.
- Безопасность: Honeypot и Time-check внедрены во все формы авторизации.
- Верификация: Email отправителя зафиксирован как `admin@knok-knok.ru`.

---

### ЭТАП 3: Push-уведомления (Web Push + PWA)

**Технологическое решение:**
- VAPID ключи → хранить в env PocketBase
- Коллекция `push_subscriptions` в PocketBase: `user_id`, `endpoint`, `p256dh`, `auth`
- PocketBase Hook `onRecordAfterCreateSuccess` → отправка push при новом сообщении

**Новые файлы:**
- **NEW** `app/public/sw.js` — Service Worker (push handler + click → открыть `/chat/:roomId`)
- **MODIFY** `app/public/manifest.json` — добавить/проверить PWA-манифест
- **NEW** `infra/home/pb_hooks/push.pb.js` — серверная логика отправки Web Push
- **NEW** `app/src/features/notifications/` — фича управления подписками
  - `hooks/usePushSubscription.ts` — запрос разрешения, subscribe/unsubscribe
  - `components/PushSubscriptionToggle.tsx` — переключатель в настройках
- **NEW** `app/src/lib/services/push.service.ts` — клиентский сервис
- **NEW** коллекция `push_subscriptions` в PocketBase

---

### ЭТАП 4: Аудио / Видео звонки (LiveKit + WebRTC)

> **Детальный план инфраструктуры:** `docs/WEBRTC_CALLS_IMPLEMENTATION.md`
> ⚠️ Примечание: этот документ содержит устаревшие ссылки на Supabase Edge Functions — заменить на PocketBase Hooks.

**Инфраструктура:**
- **NEW** `infra/home/docker-compose.livekit.yml` — LiveKit Server на домашнем сервере
- **NEW** `infra/vps/nginx.livekit.conf` — проксирование WebSocket через VPS Nginx
- **Уже есть** `infra/vps/turnserver.conf` — TURN сервер (готов)

**Backend (PocketBase Hooks, НЕ Edge Functions):**
- **NEW** `infra/home/pb_hooks/calls.pb.js`:
  - Генерация LiveKit access tokens (JWT) через `$http.send()`
  - POST `/api/hooks/calls/token` — защищённый эндпоинт
  - Логирование начала/конца звонка → коллекция `call_logs` в PocketBase
- **NEW** коллекция `call_logs` в PocketBase (не в Supabase!)

**Frontend:**
- **MODIFY** `app/src/features/calls/` — наполнить существующую папку:
  - `hooks/useCall.ts` — управление состоянием звонка
  - `hooks/useLiveKit.ts` — интеграция LiveKit SDK
  - `components/CallRoom.tsx` — UI активного звонка
  - `components/CallIncoming.tsx` — UI входящего звонка
  - `components/CallButton.tsx` — кнопка в ChatRoom
- **NEW** `app/src/stores/call/index.ts` — Zustand store для звонков

**Зависимости:**
```bash
npm install @livekit/components-react livekit-client
```

---

### ЭТАП 5: Видеозапись и отправка

**Технологическое решение:**
- `MediaRecorder API` — встроен в браузер, формат `video/webm`
- Шифрование через **существующий E2E механизм**
- Загрузка в **PocketBase Storage**
- Отображение как `type: "video"` сообщение (уже есть в схеме messages)

**Новые файлы:**
- **NEW** `app/src/features/chat/modules/VideoMessage/` — компонент записи и воспроизведения
- **MODIFY** `app/src/features/chat/` — кнопка записи видео в панели ввода

---

### ЭТАП 5.1: Архитектура фонового Task Runner (SQLite-based) (ЗАВЕРШЕНО)

Вместо использования внешних брокеров (Redis/BullMQ), мы реализуем систему очередей непосредственно на базе PocketBase. Это сохраняет проект легковесным и переносимым.

### 1. Системная коллекция `task_queue` (Реализовано)
Создается новая коллекция для хранения задач:
- **type** (select, required): `push_notification`, `email_send`, `ephemeral_cleanup`.
- **payload** (json, required): Данные задачи (IDs, контент, получатели).
- **status** (select): `pending`, `processing`, `failed`, `completed`. По умолчанию `pending`.
- **attempts** (number): Текущее количество попыток исполнения.
- **last_error** (text): Описание ошибки последней попытки.
- **run_at** (datetime): Время следующего запуска (используется для задержки при ретраях).

### 2. Механизм исполнения (Cron Worker)
Логика реализуется в файле `infra/home/pb_hooks/tasks.pb.js`:
- Регистрация планировщика: `$app.cron.add("tasks_worker", "*/1 * * * *", () => { ... })` (запуск каждую минуту).
- Алгоритм:
  1. Выборка 10 самых старых задач со статусом `pending` или `failed` (где `run_at` <= текущее время).
  2. Перевод задач в статус `processing`.
  3. Выполнение логики через асинхронные HTTP-запросы (например, к `push-gateway`).
  4. При успехе — статус `completed`.
  5. При ошибке — инкремент `attempts`, запись ошибки и вычисление `run_at` (экспоненциальный бэкофф).

### 3. Преимущества
- **Атомарность**: Задача в очередь добавляется в той же транзакции SQLite, что и само сообщение. Если сообщение не сохранилось — пуш-уведомление не встанет в очередь.
- **Минимализм**: Не требуется установка и поддержка Redis.
- **Визуализация**: Все фоновые задачи видны и доступны для ручного перезапуска прямо в админке PocketBase.

---

### ЭТАП 6: Тестирование (параллельно с 1–5)

- **Unit**: `auth.repository.ts`, `AuthService`, `useRegisterForm`, `useLoginForm`, `useAuthStore`
- **Integration**: регистрация → email-верификация → first login → onboarding → silent refresh
- **E2E (Playwright)**: полный Auth Flow, Push-уведомление при сообщении
- **Storybook**: `RegisterForm`, `VerificationBanner`, `OnboardingModal`
- **Biome**: полный аудит после каждого этапа

---

## 📅 Высокоуровневый график

| Период | Задачи |
|---|---|
| **День 1–2** | Этап 0 (Дизайн-система: `index.css` рефакторинг + тема `default`) |
| **Неделя 1** | Этап 1 (Auth + Persistent Session) + Этап 2 (SMTP/Brevo) |
| **Неделя 2** | Этап 3 (Push-уведомления + PWA) |
| **Неделя 3–4** | Этап 4 (LiveKit Audio/Video Calls) |
| **Неделя 5** | Этап 5 (Video recording) |
| **Неделя 5** | Этап 5.1 (Task Runner) |
| **Постоянно** | Этап 6 (Тесты параллельно каждому этапу) |

---

## 🔗 Связанная документация

| Документ | Описание |
|---|---|
| [DESIGN_SYSTEM_PLAN.md](./DESIGN_SYSTEM_PLAN.md) | Детальный план рефакторинга дизайн-системы (Этап 0) |
| [DESIGN.md](./DESIGN.md) | Дизайн-система, компоненты UI, правила вёрстки |
| [AUTH_STRATEGY.md](./AUTH_STRATEGY.md) | Все варианты авторизации и регистрации, стратегия сессий |
| [ROADMAP.md](./ROADMAP.md) | Глобальный прогресс проекта |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Структура папок, правила кода |
| [SECURITY_CONFIG.md](./SECURITY_CONFIG.md) | CSP, криптография, безопасность |
| [RULES.md](./RULES.md) | Правила разработки и UI/UX стандарты |
| [WEBRTC_CALLS_IMPLEMENTATION.md](./WEBRTC_CALLS_IMPLEMENTATION.md) | Детальный план LiveKit ⚠️ (частично устарел — Supabase) |
| [REGISTRATION_AND_EMAIL.md](./REGISTRATION_AND_EMAIL.md) | Инфраструктура email (SMTP, Brevo) |
| [POCKETBASE_SETUP.md](./POCKETBASE_SETUP.md) | Настройка PocketBase |
