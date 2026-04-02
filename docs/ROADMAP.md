# Roadmap проекта Knock-Knock

Актуальный статус разработки на **Апрель 2026**.

## 🟢 Выполнено (Done)

### 1. Инфраструктура и Настройка
- [x] Инициализация репозитория и монорепозитория (`/app`, `/infra`, `/docs`).
- [x] Настройка линтера Biome и Husky (pre-commit hooks).
- [x] Настройка Vite + TypeScript + React 19.
- [x] Подключение Radix UI и тем.
- [x] **Staging Environment**: Настройка изолированного окружения на домашнем сервере (VPN + VPS).
- [x] **Production Ready**: Очистка боевой базы и создание защищенного аккаунта администратора.
- [x] **QA Infrastructure**: Интеграция сид-скриптов и механики переключения .env файлов.

### 2. Базовой Функционал
- [x] **Роутинг**: TanStack Router (File-based routing).
- [x] **i18n**: Локализация (RU/EN), автоопределение языка.
- [x] **State Management**: Zustand (+ devtools).
- [x] **Backend**: Миграция на **PocketBase v0.23+**.
- [x] **Realtime**: Подписки через SSE (сообщения, чаты).
- [ ] **Presence**: Индикаторы "В сети" и "Печатает..." (🏗 Переписывается под коллекцию `presence_status`).

### 3. UI/UX и Брендинг
- [x] **Логотип**: Дизайн логотипа "Knock-Knock", адаптация под светлую тему.
- [x] **Лендинг**: Стартовая страница (`/`) с приветствием.
- [x] **Компоненты**: Пакет из 29 обёрток и UI-компонентов (Button, Alert, Text, Heading и др.).

### 4. Авторизация (Auth) и Безопасность
- [x] Вход по Magic Link (Email) и Паролю.
- [x] Валидация форм (TanStack Form + Zod).
- [x] **Ghost Mode**: PIN-код, ложный вход (Decoy PIN).

### 5. Чаты (Messaging)
- [x] `ChatList`: Список чатов с поиском, фильтрацией и корректной сортировкой (новые сверху).
- [x] `ChatRoom`: Экран переписки.
- [x] `Favorites`: Системная комната (Self-Chat), создается автоматически хуком.
- [x] Отправка/получение текстовых сообщений.
- [x] **Backend-Driven Entities**: Логика создания комнат перенесена на серверные JS-хуки.

### 6. End-to-End Шифрование (E2E)
- [x] Генерация ключей (Web Crypto API), автосинхронизация, обмен ключами (ECDH).
- [x] Прозрачное шифрование/расшифровка (AES-GCM), wrap/unwrap Room Keys.

### 7. Архитектура и Рефакторинг (FSD)
- [x] Полный рефакторинг компонентов, избавление от хардкода CSS.
- [x] Декомпозиция крупных фичей и внедрение FSD-подобной структуры (`admin`, `auth`, `calls`, `chat` и др.).
- [x] Безопасность фронтенда: внедрен заголовок Content-Security-Policy (CSP).

### 8. Медиа и Файлы
- [x] Отправка изображений (шифрованная через E2E).
- [x] Интеграция полноэкранной галереи (`yet-another-react-lightbox`).
- [x] Голосовые сообщения с кастомным интерфейсом (`AudioMessagePlayer`).
- [x] Интеграция `useLongPress` для выделения сообщений (Mobile-First interactions).

---

## 🟡 Актуальные задачи (In Progress / Next Steps)

### 0. Дизайн-система — рефакторинг и тема `default`

**Аудит выявил** 13 undeclared CSS-переменных, осиротевшие Radix-алиасы и отсутствие CSS-блока темы `default`.  
Детальный план: `docs/DESIGN_SYSTEM_PLAN.md`

- [ ] **0.1** Исправить `:root` — добавить 13 undeclared-переменных и нейтральные дефолты
- [ ] **0.2** Добавить Radix-алиасы (`--gray-1..12`, `--accent-9..11`) в `:root`
- [ ] **0.3** Создать CSS-блок `[data-theme="default"]` (WA-inspired, light + dark)
- [ ] **0.4** Обновить `neon` / `emerald` — добавить новые переменные
- [ ] **0.5** Theme Store + константы: сменить дефолт на `default` / `light`
- [ ] **0.6** Обновить `DESIGN.md` и `SKILL.md` (добавить тему default, CSS v3 как Roadmap)

### 1. Групповые чаты
- [ ] Создание групп (UI готов, требуется интеграция с PB).
- [ ] E2E шифрование для групп (распределение Room Key через `room_keys`).
- [ ] Управление участниками (админка внутри чата).

### 2. Дополнительные медиа функции
- [ ] Предпросмотр ссылок (OpenGraph).
- [ ] Отправка файлов/документов (не изображений/аудио).

### 3. Тестирование и Оптимизация
- [ ] Unit-тесты для новых компонентов (Settings).
- [ ] E2E тесты для чатов и шифрования.
- [ ] Покрытие тестами > 40%.
- [ ] **CI/CD пайплайн для PR:**
  - [ ] GitHub Actions workflow (`.github/workflows/test.yml`)
  - [ ] Автоматический запуск Biome lint при PR
  - [ ] Автоматический запуск tsc --noEmit при PR
  - [ ] Автоматический запуск Unit-тестов (Vitest) при PR
  - [ ] Статус проверки отображается в PR
  - [ ] Блокировка мержа без прохождения проверок

### 4. Регистрация и Онбординг

**✅ Принятые решения (PocketBase Era):**
- **Регистрация:** Email + Password (4 поля: email, display_name, password, passwordConfirm)
- **Верификация:** Через PocketBase + Brevo SMTP (без блокировки входа)
- **Защита:** Honeypot + Time-check + Rate Limiter (без CAPTCHA)
- **Сессия:** Persistent (JWT в localStorage, Silent Refresh каждые 30 мин)
- Подробнее: **`docs/AUTH_STRATEGY.md`** и **`docs/IMPLEMENTATION_PLAN_v2.md` → Этап 1**

- [ ] **1.1** Исправить `viewRule: ""` → `"@request.auth.id != ''"` в схеме users (уязвимость!)
- [ ] **1.2** Убрать `as unknown as AuthUser` в `auth.repository.ts:84` (Type Guard)
- [ ] **1.3** Исправить `loginSchema` (убрать `optional()`), добавить `registerSchema`
- [ ] **1.4** Создать `RegisterForm.tsx` + `useRegisterForm.ts` (display_name, Terms)
- [ ] **1.5** Реализовать Silent Token Refresh в `useAuthStore`
- [ ] **1.6** Создать маршрут `/auth/verify` + `VerificationBanner`
- [ ] **1.7** Создать `/terms` + `OnboardingModal`
- [ ] **2.x** Настроить SMTP (Brevo) + Mailpit для dev

---

## ⚪ Планируется (Backlog)

### 1. Звонки (WebRTC) — 📋 `WEBRTC_CALLS_IMPLEMENTATION.md` + `IMPLEMENTATION_PLAN_v2.md → Этап 4`

**✅ Принятые решения (PocketBase Era):**
- **WebRTC решение:** LiveKit Server (Self-Hosted на домашнем сервере)
- **Инфраструктура:** Docker Compose + Nginx (VPS) для проксирования
- **Генерация токенов:** PocketBase Hook `pb_hooks/calls.pb.js` (НЕ Supabase Edge Functions)
- **Хранение истории:** коллекция `call_logs` в **PocketBase** (НЕ Supabase)

- [ ] **Этап 0: Инфраструктура** (2-3 часа):
  - [ ] `infra/home/docker-compose.livekit.yml` — LiveKit Server
  - [ ] `infra/vps/nginx.livekit.conf` — проксирование WebSocket + TLS
  - [ ] Фаервол: порты 7880, 7881, 443, 60000-60100/UDP
- [ ] **Этап 1: Backend** (3-4 часа):
  - [ ] `infra/home/pb_hooks/calls.pb.js` — генерация LiveKit JWT токенов
  - [ ] Коллекция `call_logs` в PocketBase
- [ ] **Этап 2: Frontend** (6-8 часов):
  - [ ] `npm install @livekit/components-react livekit-client`
  - [ ] `features/calls/hooks/useCall.ts` + `useLiveKit.ts`
  - [ ] `features/calls/components/CallRoom.tsx` + `CallIncoming.tsx`
  - [ ] `stores/call/index.ts` — Zustand store
- [ ] **Этап 3: Post-MVP**:
  - [ ] Групповые звонки, Screen Sharing, Recording

### 2. PWA & Offline
- [ ] Service Worker для кэширования
- [ ] Push-уведомления (Web Push) и Offline-режим

---

## Комментарий разработчика
*Текущий статус (Апрель 2026):* PocketBase-инфраструктура стабилизирована. Архитектура Repository → Service → Hook → UI выстроена. Фактический приоритет:
1. Дизайн-система (рефакторинг index.css, тема `default`)
2. Auth (регистрация с display_name, persistent session, email верификация)
3. SMTP (Brevo), Push-уведомления, LiveKit Calls

Подробный план реализации: `docs/IMPLEMENTATION_PLAN_v2.md`
Дизайн-система: `docs/DESIGN_SYSTEM_PLAN.md`
Стратегия авторизации: `docs/AUTH_STRATEGY.md`
