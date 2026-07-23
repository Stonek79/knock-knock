# Трекер Задач: Рефакторинг Архитектуры (Детализированный)

## Фаза 1: БД и Серверные Хуки (Backend Dev Isolation) [DONE]
- `[x]` **Схема БД `pb_schema.json`**:
  - `[x]` `users`: Добавить `profile_type` (select: public/private), `public_profile_key` (text), `encrypted_profile` (json), `key_vault` (json).
  - `[x]` `users`: Сделать поля `display_name` и `avatar` опциональными (`required: false`).
  - `[x]` `users`: Удалить системное поле `role`.
  - `[x]` `messages`: Удалить поля `sender_name`, `sender_avatar`.
  - `[x]` `room_members`: Удалить поля `user_name`, `user_avatar`.
  - `[x]` `rooms`: Добавить поле `inactivity_timer` (number) и обновить `type`.
  - `[x]` `call_logs`: Удалить `participants`, добавить `encrypted_metadata` (json).
  - `[x]` `presence_status`: Удалить связь `user` (Relation), добавить `encrypted_user_id` (text).
- `[x]` **Константы БД `infra/home/pb_hooks/db.js`**:
  - `[x]` Удалить константу `ROLE`.
  - `[x]` Добавить `PROFILE_TYPE`, `PUBLIC_PROFILE_KEY`, `ENCRYPTED_PROFILE`, `KEY_VAULT`, `ENCRYPTED_USER_ID`, `ENCRYPTED_METADATA`, `INACTIVITY_TIMER`.
- `[x]` **Бизнес-логика `infra/home/pb_hooks/main.pb.js`**:
  - `[x]` Переписать проверки `user.get("role") === "admin"` на `_superusers` (все 6 мест).
  - `[x]` Изменить эндпоинт `/api/custom/users/contacts` (проверка `profile_type`).
  - `[x]` Исправить фильтр поиска по `display_name` (только для публичных профилей).
  - `[x]` Перевести отправку пушей на Blind Push (удалить `senderName`, передавать только `room_id`).
- `[x]` **RLS Правила `infra/home/pb_hooks/security.pb.js`**:
  - `[x]` Заменить проверки `authRecord.get("role") === "admin"` на проверки `_superusers`.
- `[x]` **Cron-задачи `infra/home/pb_hooks/tasks.pb.js`**:
  - `[x]` Обновить payload для отправки пушей в фоновом режиме.

## Фаза 2: Авторизация и Настройки Фронтенда (Frontend Core) [DONE]
- `[x]` **Авторизация и сессии**:
  - `[x]` `stores/auth/index.ts`: Переписать `isAdmin` на работу с сессией PB.
  - `[x]` `stores/auth/index.ts`: Реализовать дешифровку и хранение `key_vault` in memory.
  - `[x]` `routes/_auth/admin.tsx`: Обновить `admin` guards.
  - `[x]` `routes/_auth/admin/broadcast.tsx` & `users.tsx`: Обновить guards.
- `[x]` **Формы входа и регистрации**:
  - `[x]` `LoginForm`: поддержка входа админов (`pb.admins.authWithPassword`).
  - `[x]` `RegisterForm`: выбор Бизнес / Инкогнито с генерацией `Key Vault` и `Profile Key`.
- `[x]` **Навигация и настройки**:
  - `[x]` `SettingsSidebar/index.tsx`: заменить `pbUser?.role === "admin"` на `pb.authStore.isAdmin`.
  - `[x]` `SettingsMenu/index.tsx`: то же самое.
- `[x]` **Компоненты настроек**:
  - `[x]` `PrivacySettings`: логика переключения типа профиля (Бизнес / Инкогнито).
  - `[x]` `NotificationSettings`: переключатель показа текста в пушах.
  - `[x]` `StorageSettings` & `SecuritySettings`: очистка/сброс Vault с защитой ключа Favorites.
  - `[x]` `ProfileSettings`: логика редактирования инкогнито-профиля (обновление `encrypted_profile`).
  - `[x]` `ChangePasswordForm`: перешифрование `key_vault` при смене пароля.
  - `[x]` `DeleteAccountModal`: удаление `key_vault` и ключей комнат с сервера при удалении.
- `[x]` **Административный модуль** (`features/admin/`):
  - `[x]` `AdminLayout/index.tsx`: заменить `role === "admin"` на проверку сессии PB.
  - `[x]` `AdminSidebar/index.tsx`: убрать зависимость от `user.role`.
  - `[x]` `AdminDashboard/index.tsx` & `TestTools.tsx`: привести к новой схеме авторизации.
  - `[x]` `UserList/index.tsx`: убрать/адаптировать отображение поля `role`.
  - `[x]` `Broadcast/index.tsx` & `BroadcastHistory/index.tsx`: обновить тип payload (без `senderName`).
  - `[x]` `hooks/useUserManagement.ts`: привести мутации бан/разбан к новому API.

## Фаза 3: Мапперы и Дешифровка Профилей (Frontend Data Layer)
- `[x]` **Типы и валидация**:
  - `[x]` `pocketbase-types.ts` & `schemas/*.ts`: обновить структуры согласно новой схеме.
  - `[x]` `constants/db.ts`: привести константы полей таблиц в соответствие с новыми типами.
- `[x]` **Маппинг данных**:
  - `[x]` `userMapper.ts`: логика извлечения имени в зависимости от `profile_type`.
  - `[x]` `roomMapper.ts`: сопоставление по UUID через локальный реестр.
  - `[x]` `messageMapper.ts`: сопоставление UUID отправителя, удаление зависимости от открытого `sender_name`.
  - `[x]` `chat/list/utils/roomUiMapper.ts` (`mapRoomToChatItem`): привести к новой схеме (Vault / БД по `profile_type`).
  - `[x]` `features/contacts/ContactList/index.tsx`: перевести на расшифрованные данные (Public — БД, Private — Vault).

## Фаза 4: Чаты, WebRTC и Push-Миграция
- `[x]` **Шифрование чатов**:
  - `[x]` `chat-crypto.ts` & `optimistic.ts`: логика Sealed Sender (упаковка метаданных в payload).
  - `[x]` `useChatActions.ts`: убрать `isAdmin: user.role === USER_ROLE.ADMIN` (системная). Роль в комнате (`room_members.role`) — НЕ ТРОГАТЬ.
- `[x]` **Service Worker**:
  - `[x]` `sw.ts`: Приём Blind Push и локальная дешифровка.
- `[x]` **Миграция сети и обход DPI**:
  - `[x]` Развернуть и настроить FRP Server на зарубежном VPS.
  - `[x]` Развернуть `push-gateway` на зарубежном VPS.
  - `[x]` Развернуть Nginx на VPS для приема трафика.
  - `[x]` Завернуть FRP туннель в VPN (Hiddify/happ) на Домашнем сервере для защиты от сбросов соединения провайдером.
- `[ ]` **Звонки и WebRTC**:
  - `[ ]` Скрытие участников в токенах LiveKit.
  - `[ ]` Шифрование логов `call_logs` ключом комнаты.

## Phase 5: Каналы, UI Групп, Модерация и Валидация
- `[ ]` **Группы и Контакты (UI)**:
  - `[ ]` `GroupInfoPanel/index.tsx`: перевести отображение имён участников на Vault-источник.
  - `[ ]` `GroupMemberItem/index.tsx`: аналогично.
  - `[ ]` `GroupInfoPanel/index.tsx` — `handleUpdateRole`: НЕ ТРОГАТЬ логику. Только обновить типы под новый `pocketbase-types.ts`.
- `[ ]` **Каналы**:
  - `[ ]` Реализовать логику Открытых и Закрытых каналов.
  - `[ ]` Внедрить cron в pb_hooks для удаления неактивных каналов.
- `[ ]` **Модерация**:
  - `[ ]` Обновить логику отправки жалоб (прикладывать расшифрованный текст для админа).
- `[ ]` **Верификация**:
  - `[ ]` Пройти Biome-линтинг.
  - `[ ]` Запустить тесты и проверить в режиме Dev-изоляции.
- `[ ]` **Type-Safe Realtime Architecture (Refactoring)**:
  - `[ ]` Внедрить Discriminated Unions для маршрутизации событий SSE (на основе сгенерированных типов `pocketbase-types.ts`).
  - `[ ]` Отрефакторить обработчики подписок в `message.repository.ts` и `presence.repository.ts`, убрав разрозненные `if (action === 'create')`.
  - `[ ]` Создать единый типизированный редюсер/стор для обработки входящих событий чата.
