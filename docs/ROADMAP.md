# Roadmap проекта Nemo

Актуальный статус разработки.

## 🟢 Выполнено (Done)

### 1. Инфраструктура и Настройка
- [x] Инициализация репозитория и монорепозитория (`/app`, `/infra`, `/docs`).
- [x] Настройка линтера Biome и Husky (pre-commit hooks).
- [x] Настройка Vite + TypeScript + React 19.
- [x] Подключение Radix UI и тем.
- [x] **Staging Environment**: Настройка изолированного окружения на домашнем сервере (VPN + VPS).
- [x] **Production Ready**: Очистка боевой базы и создание защищенного аккаунта администратора.
- [x] **QA Infrastructure**: Интеграция сид-скриптов и механики переключения .env файлов.
- [x] **Task Runner Architecture**: Внедрена асинхронная очередь на базе SQLite-коллекций и серверных JS-хуков.

### 2. Базовой Функционал
- [x] **Роутинг**: TanStack Router (File-based routing).
- [x] **i18n**: Локализация (RU/EN), автоопределение языка.
- [x] **State Management**: Zustand (+ devtools).
- [x] **Backend**: Миграция на **PocketBase v0.23+**.
- [x] **Realtime**: Подписки через SSE (сообщения, чаты).

### 3. UI/UX и Брендинг
- [x] **Логотип**: Дизайн логотипа "Nemo", адаптация под светлую тему.
- [x] **Лендинг**: Стартовая страница (`/`) с приветствием.
- [x] **Компоненты**: Пакет из 29 обёрток и UI-компонентов (Button, Alert, Text, Heading и др.).
- [x] **Дизайн-система**: Рефакторинг `index.css`, добавление темы `default` и 13 новых переменных.

### 4. Авторизация (Auth) и Безопасность
- [x] Вход по Magic Link (Email) и Паролю.
- [x] Валидация форм (TanStack Form + Zod).
- [x] **Ghost Mode**: PIN-код, ложный вход (Decoy PIN).
- [x] **Регистрация**: Email + Password (display_name, Terms, Onboarding).
- [x] **Сессия**: Persistent (JWT в localStorage, Silent Refresh).

### 5. Чаты (Messaging)
- [x] `ChatList`: Список чатов с поиском, фильтрацией и сортировкой.
- [x] `ChatRoom`: Экран переписки.
- [x] `Favorites`: Системная комната (Self-Chat), создается автоматически хуком.
- [x] Отправка/получение текстовых сообщений.
- [x] **Backend-Driven Entities**: Логика комнат на серверных JS-хуках.
- [x] **Optimistic UI**: Оптимистичная отправка текстовых сообщений (v2).

### 6. End-to-End Шифрование (E2E)
- [x] Генерация ключей (Web Crypto API), автосинхронизация, обмен ключами (ECDH).
- [x] Прозрачное шифрование/расшифровка (AES-GCM), wrap/unwrap Room Keys.

### 7. Инфраструктура сообщений и SMTP
- [x] **SMTP (Brevo)**: Настроена отправка писем через внешний сервис.
- [x] **Mailpit**: Локальная отладка писем.
- [x] **Security**: Honeypot + Time-check на формах регистрации.

### 8. Push-уведомления (Stage 3)
- [x] **Web Push API**: Регистрация и жизненный цикл Service Worker.
- [x] **Subscription Management**: Сохранение и удаление подписок в PocketBase (поле `user_id`).
- [x] **Payload Handlers**: Обработка push-событий, объединение слушателей кликов, логика `navigate` и `focus`.
- [x] **Type Safety**: Полная типизация воркера и хуков без использования `any`.
- [x] **Clean Code**: 100% покрытие константами, отсутствие магических строк.

---

## 🟡 Актуальные задачи (In Progress / Next Steps)

### 1. Современная медиа-система (v3) — 📋 `plans/media_system_v3.md`
- [ ] **3.1** Переход на **Dexie.js** для Offline-хранилища (IndexedDB).
- [ ] **3.2** Реализация **Web Workers** для сжатия (WebCodecs) и шифрования медиа.
- [ ] **3.3** "Умная" очистка кэша (TTL + Favorites retention).

### 2. Групповые чаты
- [ ] Создание групп (интеграция с PB).
- [ ] E2E шифрование для групп.
- [ ] Управление участниками.

---

## ⚪ Планируется (Backlog)

### 0. Превью ссылок (OpenGraph Link Previews)
- [ ] Разработка системы генерации красивых карточек предпросмотра для ссылок, отправленных в чате. Отложено для более поздних этапов после PWA и WebRTC.

### 1. Звонки (WebRTC) — 📋 `WEBRTC_CALLS_IMPLEMENTATION.md` + `IMPLEMENTATION_PLAN_v2.md → Этап 4`

**✅ Принятые решения (PocketBase Era):**
- **WebRTC решение:** LiveKit Server (Self-Hosted на домашнем сервере)
- **Инфраструктура:** Docker Compose + Nginx (VPS) для проксирования
- **Генерация токенов:** PocketBase Hook `pb_hooks/calls.pb.js`
- **Хранение истории:** коллекция `call_logs` в **PocketBase**

- [x] **Этап 0: Инфраструктура** (Реализовано на VPS):
  - [x] `infra/vps_new/docker-compose.yml` — LiveKit Server & Redis
  - [x] Nginx TCP/UDP Stream + WebSocket проксирование
  - [x] Фаервол: открыты нужные TCP/UDP порты
- [x] **Этап 1: Backend** (PocketBase Hooks):
  - [x] `infra/home/pb_hooks/calls.pb.js` — генерация LiveKit JWT токенов
  - [x] Системная коллекция для LiveKit Webhooks (если требуется)
- [x] **Этап 2: Frontend** (LiveKit UI):
  - [x] Установлены `@livekit/components-react` и `livekit-client`
  - [x] `features/calls/store.ts` — состояние звонка
  - [x] `features/calls/CallRoom.tsx` + `IncomingCallAlert.tsx`
- [x] **Этап 3: Тестирование и Post-MVP**:
  - [x] UI/UX Видеозвонка (PiP, адаптивность, исправление багов на iOS/Mobile)
  - [ ] Групповые звонки, Screen Sharing, Recording

### 2. PWA & Offline
- [ ] Service Worker для кэширования
- [ ] Push-уведомления (Web Push) и Offline-режим

### 3. Ребрендинг и Инфраструктура v2 (Nemo)
- [x] Создание нового логотипа и выбор названия (Nemo)
- [x] План разделения Dev/Prod репозиториев (Скрытие следов)
- [x] Гибридная S3 инфраструктура (Фронт на VPS, Данные дома)
- [x] Полный рефакторинг кодовой базы (замена старого названия)

---

## Комментарий разработчика
*Текущий статус:* PocketBase-инфраструктура стабилизирована. Архитектура Repository → Service → Hook → UI выстроена. Фактический приоритет:
1. Дизайн-система (рефакторинг index.css, тема `default`)
2. Auth (регистрация с display_name, persistent session, email верификация)
3. SMTP (Brevo), Push-уведомления, LiveKit Calls

Подробный план реализации: `docs/IMPLEMENTATION_PLAN_v2.md`
Дизайн-система: `docs/DESIGN_SYSTEM_PLAN.md`
Стратегия авторизации: `docs/AUTH_STRATEGY.md`
