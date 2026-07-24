# Master Implementation Plan (Knock-Knock v2 & whoami.ninja Infrastructure)

## 1. Общий обзор архитектуры и переезда на домен `whoami.ninja`

Проект **Knock-Knock** переведён на целевую инфраструктуру **`whoami.ninja`** с полным соблюдением концепции **Zero-Knowledge (ZK)**:
- **Фронтенд (`whoami-web`)**: React 19, TypeScript strict (без `any`), Zustand, TanStack Router/Query, кастомный UI-кит (`src/components/ui/`), подстраиваемый под глобальные CSS-темы (`default`, `neon`, `emerald`).
- **Бэкенд (`whoami-pb`)**: PocketBase v0.23+ в Docker-контейнере (`ghcr.io/muchobien/pocketbase:latest`). Изолированные JS-хуки (`pb_hooks/`) с соблюдением паттерна *Double Require*, анонимизацией пользователей и шифрованием логов.
- **WebRTC & Push Шлюз (`whoami-push` / `whoami-livekit`)**: Отдельные сервисы на VPS (`149.33.42.8`) для обхода блокировок NAT/DPI.
- **Nginx VPS (`infra/vps_new/nginx/default.conf`)**: Обработка SSL/TLS, маршрутизация `/push/` и WSS `/livekit/` с поддержкой заголовков WebSockets (`Upgrade`/`Connection`).

---

## 2. Схема коллекций БД и ZK-модель
- **`users`**: Публичные данные (Бизнес) / Зашифрованный профиль `encrypted_profile` (Инкогнито).
- **`call_logs`**: Записи звонков с зашифрованными метаданными `encrypted_metadata` (json) без открытых ID участников.
- **`task_queue`**: Фоновая системная очередь для рассылки Blind Push.

---

## 3. Фронтенд — Кастомный UI Звонков и Дизайн-Система

### Использование кастомного UI-кита (`src/components/ui/`):
- Полный отказ от дефолтной верстки сторонних библиотек (LiveKit `<VideoConference />`).
- Применение собственных компонентов: `Button`, `IconButton`, `Avatar`, `Badge`, `Card`, `Dialog`, `Tooltip`.

### Поддержка Открытых и Приватных/Инкогнито контактов:
- **Открытый контакт**: Отображение реального аватара и имени из контактов.
- **Приватный собеседник (Инкогнито / ZK)**: Стилизованная анонимная карточка с неоновым маска-аватаром 🕵️‍♂️, подписью «Приватный собеседник» и бейджем «Зашифрованный E2EE-звонок».

### Режим Picture-in-Picture (PIP / Компактный плавающий виджет):
- Сворачивание вызова в угловой виджет `CallPIPWidget.tsx` для параллельной переписки в чатах без разрыва соединения.

---

## 4. Текущий статус выполнения по Модулям

### [DONE] Инфраструктура и Домен whoami.ninja
- `[x]` Обновлены все конфигурации: `env.ts`, `index.html` (CSP), `prod/docker-compose.yml`, `dev/docker-compose.yml`, `pb-setup-server.sh`.
- `[x]` Nginx VPS перенастроен с поддержкой `/push/` и WSS `/livekit/`.

### [DONE] Бэкенд Звонков (`calls.pb.js`)
- `[x]` Паттерн *Double Require* и нативный `$apis.requestInfo(c)`.
- `[x]` Анонимизация `participantIdentity = anon_${md5}`.
- `[x]` Запись `call_logs` со статусом `ringing` и `encrypted_metadata`.
- `[x]` Динамическая загрузка URL push-шлюза из `PB_PUSH_GATEWAY_URL`.

### [IN PROGRESS] Фронтенд UI/UX Звонков (`features/calls/`)
- `[ ]` Кастомный `CallControls.tsx` на компонентах `src/components/ui/IconButton`.
- `[ ]` Плавающий виджет сворачивания `CallPIPWidget.tsx` (PIP).
- `[ ]` Адаптивная карточка входящего вызова `IncomingCallAlert.tsx` (Открытый / Инкогнито контакт).
- `[ ]` Кнопка вызова в шапке чата `ChatHeader.tsx`.

---

## 5. Валидация и Контроль Качества
- **Biome Linter**: `0 ошибок`.
- **TypeScript Compiler**: `0 ошибок`.
- **Строгая типизация**: `0 использование any` в рабочем коде `app/src/`.
