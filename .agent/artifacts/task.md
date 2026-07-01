# Трекер Задач: Рефакторинг Архитектуры (Детализированный)

## Фаза 1: БД и Серверные Хуки (Backend Dev Isolation)
- `[ ]` **Схема БД `pb_schema.json`**:
  - `[ ]` `users`: Добавить `profile_type` (select: public/private), `public_profile_key` (text), `encrypted_profile` (json), `key_vault` (json).
  - `[ ]` `users`: Сделать поля `display_name` и `avatar` опциональными (`required: false`).
  - `[ ]` `users`: Удалить системное поле `role`.
  - `[ ]` `messages`: Удалить поля `sender_name`, `sender_avatar`.
  - `[ ]` `room_members`: Удалить поля `user_name`, `user_avatar`.
  - `[ ]` `rooms`: Добавить поле `inactivity_timer` (number) и обновить `type`.
  - `[ ]` `call_logs`: Удалить `participants`, добавить `encrypted_metadata` (json).
  - `[ ]` `presence_status`: Удалить связь `user` (Relation), добавить `encrypted_user_id` (text).
- `[ ]` **Константы БД `infra/home/pb_hooks/db.js`**:
  - `[ ]` Удалить константу `ROLE`.
  - `[ ]` Добавить `PROFILE_TYPE`, `PUBLIC_PROFILE_KEY`, `ENCRYPTED_PROFILE`, `KEY_VAULT`, `ENCRYPTED_USER_ID`, `ENCRYPTED_METADATA`, `INACTIVITY_TIMER`.
- `[ ]` **Бизнес-логика `infra/home/pb_hooks/main.pb.js`**:
  - `[ ]` Переписать проверки `user.get("role") === "admin"` на `_superusers` (все 6 мест).
  - `[ ]` Изменить эндпоинт `/api/custom/users/contacts` (проверка `profile_type`).
  - `[ ]` Исправить фильтр поиска по `display_name` (только для публичных профилей).
  - `[ ]` Перевести отправку пушей на Blind Push (удалить `senderName`, передавать только `room_id`).
- `[ ]` **RLS Правила `infra/home/pb_hooks/security.pb.js`**:
  - `[ ]` Заменить проверки `authRecord.get("role") === "admin"` на проверки `_superusers`.
- `[ ]` **Cron-задачи `infra/home/pb_hooks/tasks.pb.js`**:
  - `[ ]` Обновить payload для отправки пушей в фоновом режиме.

## Фаза 2: Авторизация и Настройки Фронтенда (Frontend Core)
- `[ ]` **Авторизация и сессии**:
  - `[ ]` `stores/auth/index.ts`: Переписать `isAdmin` на работу с сессией PB.
  - `[ ]` `stores/auth/index.ts`: Реализовать дешифровку и хранение `key_vault` in memory.
  - `[ ]` `routes/_auth/admin.tsx`: Обновить `admin` guards.
  - `[ ]` `routes/_auth/admin/broadcast.tsx` & `users.tsx`: Обновить guards.
- `[ ]` **Формы входа и регистрации**:
  - `[ ]` `LoginForm`: поддержка входа админов (`pb.admins.authWithPassword`).
  - `[ ]` `RegisterForm`: выбор Бизнес / Инкогнито с генерацией `Key Vault` и `Profile Key`.
- `[ ]` **Компоненты настроек**:
  - `[ ]` `PrivacySettings`: логика переключения типа профиля (Бизнес / Инкогнито).
  - `[ ]` `NotificationSettings`: переключатель показа текста в пушах.
  - `[ ]` `StorageSettings` & `SecuritySettings`: очистка/сброс Vault с защитой ключа Favorites.
  - `[ ]` `ProfileSettings`: логика редактирования инкогнито-профиля (обновление `encrypted_profile`).
  - `[ ]` `ChangePasswordForm`: перешифрование `key_vault` при смене пароля.
  - `[ ]` `DeleteAccountModal`: удаление `key_vault` и ключей комнат с сервера при удалении.

## Фаза 3: Мапперы и Дешифровка Профилей (Frontend Data Layer)
- `[ ]` **Типы и валидация**:
  - `[ ]` `pocketbase-types.ts` & `schemas/*.ts`: обновить структуры согласно новой схеме.
- `[ ]` **Маппинг данных**:
  - `[ ]` `userMapper.ts`: логика извлечения имени в зависимости от `profile_type`.
  - `[ ]` `roomMapper.ts`: сопоставление по UUID через локальный реестр.
  - `[ ]` `messageMapper.ts`: сопоставление UUID отправителя, удаление зависимости от открытого `sender_name`.

## Фаза 4: Чаты, WebRTC и Push-Миграция
- `[ ]` **Шифрование чатов**:
  - `[ ]` `chat-crypto.ts` & `optimistic.ts`: логика Sealed Sender (упаковка метаданных в payload).
- `[ ]` **Service Worker**:
  - `[ ]` `sw.ts`: Приём Blind Push и локальная дешифровка.
- `[ ]` **Миграция и VPS**:
  - `[ ]` Развернуть прокси Rathole на зарубежном VPS.
  - `[ ]` Развернуть `push-gateway` на зарубежном VPS.
  - `[ ]` Проверить обход блокировок через Service Worker туннель.
- `[ ]` **Звонки и WebRTC**:
  - `[ ]` Скрытие участников в токенах LiveKit.
  - `[ ]` Шифрование логов `call_logs` ключом комнаты.

## Phase 5: Каналы, Модерация и Валидация
- `[ ]` **Каналы**:
  - `[ ]` Реализовать логику Открытых и Закрытых каналов.
  - `[ ]` Внедрить cron в pb_hooks для удаления неактивных каналов.
- `[ ]` **Модерация**:
  - `[ ]` Обновить логику отправки жалоб (прикладывать расшифрованный текст для админа).
- `[ ]` **Верификация**:
  - `[ ]` Пройти Biome-линтинг.
  - `[ ]` Запустить тесты и проверить в режиме Dev-изоляции.
