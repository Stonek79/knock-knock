# Чек-лист выполнения задач Knock-Knock (v2 & whoami.ninja)

## Фаза 1: Бэкенд и Схема БД (PocketBase v0.23+) [DONE]
- `[x]` **Схема БД (`pb_schema.json`)**:
  - `[x]` `call_logs`: замена открытых полей на `encrypted_metadata` (json).
  - `[x]` `task_queue`: создание системной очереди для Blind Push.
- `[x]` **Константы БД `infra/home/pb_hooks/db.js`**:
  - `[x]` Добавлены необходимые константы таблицы и статусы задач.
- `[x]` **Бизнес-логика `infra/home/pb_hooks/calls.pb.js`**:
  - `[x]` Паттерн *Double Require* (`const DB = require(...)`) внутри обработчика `routerAdd`.
  - `[x]` Нативное считывание тела запроса `$apis.requestInfo(c)`.
  - `[x]` Анонимизация участников в LiveKit токенах (`anon_${md5}`).
  - `[x]` Шифрование метаданных звонка в `call_logs` (`encrypted_metadata`).
  - `[x]` Отправка Blind Push через `task_queue`.
  - `[x]` Динамический резолв URL push-шлюза из `PB_PUSH_GATEWAY_URL`.

## Фаза 2: Инфраструктура и Переезд на домен whoami.ninja [DONE]
- `[x]` **Фронтенд и Клиенты**:
  - `[x]` `app/src/lib/env.ts`: дефолтный URL `https://api.whoami.ninja`.
  - `[x]` `app/index.html`: CSP заголовки для `whoami.ninja` и `wss://whoami.ninja`.
  - `[x]` `app/.env.test` & `app/README.md`: обновление ссылок на домен.
- `[x]` **Docker & Nginx**:
  - `[x]` `infra/prod/docker-compose.yml`: путь к БД `/home/alex/whoami-bd/pb_data`.
  - `[x]` `infra/dev/docker-compose.yml`: путь к DEV БД `/home/alex/whoami-bd-dev/pb_data`.
  - `[x]` `infra/vps_new/nginx/default.conf`: проксирование `/push/` и WSS `/livekit/` с заголовками `Upgrade`/`Connection`.
  - `[x]` `scripts/pb-setup-server.sh`: деплой в каталог `~/whoami-bd`.

## Фаза 3: Мапперы и Дешифровка Профилей (Frontend Data Layer) [DONE]
- `[x]` **Типы и валидация**:
  - `[x]` `pocketbase-types.ts` & `schemas/*.ts`: обновить структуры согласно новой схеме.
- `[x]` **Маппинг данных**:
  - `[x]` `userMapper.ts`: логика извлечения имени в зависимости от `profile_type`.
  - `[x]` `roomMapper.ts`: сопоставление по UUID через локальный реестр.

## Фаза 4: Фронтенд Звонков и Кастомный UI (In Progress)
- `[ ]` **Zustand-стор звонков (`useCallStore.ts`)**:
  - `[ ]` Добавить состояние `isMinimized` (PIP-режим) и `callerInfo` (аватар, имя, флаг `isIncognito`).
  - `[ ]` Добавить методы `toggleMinimize()` и `initiateCall(roomId, peerInfo)`.
- `[ ]` **Кастомная панель управления (`CallControls.tsx`)**:
  - `[ ]` Написать кнопки управления на компонентах `src/components/ui/IconButton` (`Mic`, `Video`, `Volume`, `Minimize`, `PhoneOff`).
  - `[ ]` Применить CSS-переменные из `index.css` с поддержкой тем (`default`, `neon`, `emerald`).
- `[ ]` **Сетка участников и PIP-виджет**:
  - `[ ]` `CallPIPWidget.tsx`: компактный плавающий виджет с размытием (`backdrop-filter`) в углу экрана.
  - `[ ]` Использовать кастомную сетку участников на основе `useTracks` без дефолтного `<VideoConference />`.
- `[ ]` **Карточка входящего вызова (`IncomingCallAlert.tsx`)**:
  - `[ ]` Модальное окно `Dialog` на компонентах `src/components/ui/`.
  - `[ ]` Поддержка открытого профиля (аватар + имя) и инкогнито-профиля (анонимная карточка 🕵️‍♂️ "Приватный собеседник").
- `[ ]` **Интеграция с шапкой чата**:
  - `[ ]` Кнопка вызова с иконкой трубки в `ChatHeader.tsx`.

## Фаза 5: Валидация и Проверки [DONE]
- `[x]` **Biome Linter**: 0 ошибок (`Checked 536 files`).
- `[x]` **TypeScript Compiler**: `tsc --noEmit` прошел с 0 ошибок.
- `[x]` **Аудит субагентов**: Проведены проверки субагентами `Code Reviewer`, `Infrastructure Supervisor` и `FrontDesignAuditor`.
