# Пофайловый План Рефакторинга: Metadata Resistance & Channels (Zero-Knowledge)

Этот документ представляет собой пофайловый план реализации новой архитектуры (Бизнес/Приватные профили, Sealed Sender, Key Vault, Каналы, WebRTC и Push).

---

## 1. Zero-Knowledge Архитектура (Безопасность от Админа БД)

Для пользователей в режиме **Инкогнито (Private)** и для всех критических метаданных чатов реализуется схема **Zero-Knowledge**: администратор базы данных или злоумышленник с полным доступом к PocketBase **не может** прочитать конфиденциальные данные.

### 1.1. Профили Инкогнито (Private)
- В БД для такого пользователя поля `display_name`, `avatar` и `email` хранятся как `null` (или заменяются случайным UUID).
- Реальные данные шифруются в JSON-структуру `encrypted_profile` на клиенте с помощью алгоритма AES-GCM.
- Ключ шифрования профиля (`Profile Key`) генерируется на клиенте и упаковывается в `key_vault`.
- `key_vault` шифруется с помощью мастер-пароля пользователя (на основе PBKDF2/Scrypt) перед отправкой на сервер. Сервер никогда не получает мастер-пароль в открытом виде (только хэш для авторизации, отличный от ключа шифрования), поэтому **администратор БД не имеет технической возможности расшифровать профили инкогнито-пользователей**.

### 1.2. Переписка и Звонки
- Все сообщения (`messages`) шифруются E2E на ключах комнат. Поля имени и аватара отправителя (`sender_name`, `sender_avatar`) полностью удаляются из схемы БД.
- Логи звонков (`call_logs`) полностью скрывают участников: открытый массив `participants` удаляется, список UUID участников шифруется ключом комнаты и сохраняется в `encrypted_metadata`.
- Статусы активности (`presence_status`) шифруют связь с пользователем: вместо связи `user` хранится `encrypted_user_id` (UUID пользователя, зашифрованный ключом комнаты). Сервер не знает, кто именно печатает или онлайн в конкретной комнате.

### 1.3. Профили Бизнес (Public)
- Пользователь добровольно публикует свои `display_name` и `avatar` в открытых полях БД для возможности глобального поиска по контактам и участия в публичных каналах. В `public_profile_key` публикуется его открытый ключ.

---

## 2. База Данных и Серверные Хуки (Инфраструктура)

### [MODIFY] `infra/home/pb_schema.json` (Схема БД)
- **Коллекция `users`**:
  - Сделать поля `display_name` и `avatar` опциональными (`required: false`).
  - Удалить системное поле `role` (права админа выносятся в `_superusers`).
  - Добавить поля:
    - `profile_type` (text/select: `public` | `private`)
    - `public_profile_key` (text)
    - `encrypted_profile` (json)
    - `key_vault` (json)
- **Коллекция `messages`**: Удалить `sender_name`, `sender_avatar`.
- **Коллекция `room_members`**: Удалить `user_name`, `user_avatar`.
- **Коллекция `rooms`**: Добавить `inactivity_timer` (number). Расширить перечень `type` (`public_channel`, `private_channel`, `direct`, `group`, `ephemeral`).
- **Коллекция `media`**: Удалить метаданные об оригинальном имени/типе файла из открытого вида.
- **Коллекция `call_logs`**: Удалить поле `participants`, заменить на `encrypted_metadata` (json), шифруемый ключом комнаты.
- **Коллекция `presence_status`**: Удалить связь `user` (Relation). Добавить `encrypted_user_id` (зашифрованный UUID пользователя ключом комнаты), чтобы скрыть социальный граф.

### [MODIFY] `infra/home/pb_hooks/db.js` (Константы БД)
- Удалить/переименовать константы полей, связанные с `ROLE`, `sender_name`, `sender_avatar`, `user_name`, `user_avatar`.
- Добавить константы для новых полей (`PROFILE_TYPE`, `PUBLIC_PROFILE_KEY`, `ENCRYPTED_PROFILE`, `KEY_VAULT`, `ENCRYPTED_USER_ID`, `ENCRYPTED_METADATA`, `INACTIVITY_TIMER`).

### [MODIFY] `infra/home/pb_hooks/main.pb.js` (Бизнес-логика сервера)
- Переписать проверку прав администратора (6 мест с `user.get("role") === "admin"`) на запросы к системной таблице `_superusers`.
- **Эндпоинт `/api/custom/users/contacts`**: отдавать `display_name` и `avatar` только если `profile_type === 'public'`, иначе возвращать только UUID.
- **Поиск пользователей**: изменить поисковый фильтр `display_name ~ ...` так, чтобы он искал только по аккаунтам с `profile_type === 'public'`.
- **Формирование Push (строка 376)**: Заменить отправку открытых `senderName` и текста на Blind Push (только `{ type: "new_message", room_id }`).

### [MODIFY] `infra/home/pb_hooks/security.pb.js` (RLS правила)
- Заменить RLS-проверки `authRecord.get("role") === "admin"` для коллекций `room_members` и `messages` на проверки принадлежности к `_superusers`.

### [MODIFY] `infra/home/pb_hooks/tasks.pb.js` (Cron-задачи)
- Обновить Payload в очереди задач при рассылке уведомлений (исключить утечку открытого текста сообщений, использовать Blind Push формат).

---

## 3. Глубокий рефакторинг Фронтенда (Пофайловый)

### [MODIFY] `app/src/lib/types/pocketbase-types.ts` & `schemas/*.ts`
- Обновить генерируемые типы PocketBase: убрать `role`, сделать `display_name` и `avatar` опциональными (`?string`). Добавить новые поля `profile_type`, `key_vault` и т.д.

### [MODIFY] `app/src/lib/repositories/mappers/userMapper.ts`
- Проверять `profile_type`. Если `public` — брать `display_name` напрямую. Если `private` — запрашивать дешифровку через `ProfileCryptoService` из локального кэша по UUID.

### [MODIFY] `app/src/lib/repositories/mappers/roomMapper.ts` & `messageMapper.ts`
- Исключить чтение прямых полей `sender_name`/`sender_avatar`, использовать сопоставление по UUID через локальный реестр расшифрованных профилей.

### [MODIFY] `app/src/lib/repositories/user.repository.ts` & `auth.repository.ts`
- Добавить методы для обновления `profile_type`, шифрования `encrypted_profile` и сохранения `key_vault`.

### [MODIFY] `app/src/stores/auth/index.ts` (Авторизация)
- Изменить `isAdmin: profile.role === "admin"` на проверку роли через сессию PocketBase (`pb.authStore.isAdmin`).
- Обеспечить загрузку `key_vault` в память при успешном входе и его дешифровку Мастер-Паролем.

### [MODIFY] `app/src/routes/_auth/admin.tsx` & `admin/broadcast.tsx` & `admin/users.tsx`
- Заменить проверку `pbUser?.role !== "admin"` на `pb.authStore.isAdmin`.

### [MODIFY] `app/src/features/auth/components/LoginForm/index.tsx` & `RegisterForm/index.tsx`
- **LoginForm**: поддержка входа администраторов (через `pb.admins.authWithPassword`). Дешифровка `key_vault` при успешном входе с использованием мастер-пароля.
- **RegisterForm**: шаг выбора типа аккаунта (Бизнес / Инкогнито) с генерацией `Key Vault` и `Profile Key`.

---

## 4. Настройки, Профиль и Favorites

### [MODIFY] `app/src/features/settings/PrivacySettings/index.tsx`
- Добавить переключатель "Тип аккаунта" (Бизнес / Инкогнито).
- При переходе в Инкогнито: зашифровать профиль, сохранить в `encrypted_profile`, очистить `display_name` и `avatar` в БД.
- При переходе в Бизнес: расшифровать локальные данные и записать в открытые поля `users` в БД.

### [MODIFY] `app/src/features/settings/NotificationSettings/index.tsx`
- Добавить переключатель "Показывать имя и текст сообщения в уведомлениях" (управляет локальной дешифровкой Blind Push на уровне Service Worker).

### [MODIFY] `app/src/features/settings/StorageSettings/index.tsx` & `SecuritySettings/index.tsx`
- Реализовать сброс локального `KeyVault` (полный логаут со сбросом ключей).
- Защитить ключ комнаты `Favorites` (self-chat) от удаления при очистке медиа-кэша.

### [MODIFY] `app/src/features/settings/ProfileSettings/index.tsx`
- При редактировании имени/аватара обновлять открытые поля для Бизнес-аккаунта и зашифрованный `encrypted_profile` для Инкогнито-аккаунта.

### [MODIFY] `app/src/features/settings/AccountSettings/ChangePasswordForm/index.tsx`
- При смене пароля перешифровать `key_vault` пользователя новым мастер-паролем.

### [MODIFY] `app/src/features/settings/AccountSettings/DeleteAccountModal/index.tsx`
- При удалении аккаунта очищать серверный `key_vault` и удалять ключи всех связанных комнат.

---

## 5. UI и Логика Чатов

### [MODIFY] `app/src/features/chat/message/components/MessageList/index.tsx` & `MessageBubble/index.tsx` & `RoomHeader/index.tsx`
- Убрать зависимость от `role` пользователя в чате.
- Отображение имен и аватарок перевести на расшифрованные мапперами структуры.

### [MODIFY] `app/src/features/chat/message/utils/optimistic.ts` & `hooks/useChatActions.ts`
- Sealed Sender логика, оптимистичный рендеринг без передачи `sender_name`/`sender_avatar` в API.

### [MODIFY] `app/src/lib/services/chat-crypto.ts`
- Дешифровка контента сообщения, извлечение упакованных метаданных отправителя.

---

## 6. Звонки, WebRTC и Push-уведомления (BYPASS_STRATEGY)

### [MODIFY] `app/src/features/calls/` & `call_logs`
- Сокрытие участников звонка: сервер генерирует LiveKit токен, используя UUID участников вместо реальных имен.
- Запись логов звонков: шифровать участников `call_logs` ключом комнаты.

### [MODIFY] `app/src/sw.ts` (Service Worker)
- WebSocket-туннелирование для обхода блокировок.
- Обработка Blind Push: при получении события с `roomId` будить приложение, считывать зашифрованные данные и, если разрешено настройками, показывать уведомление с расшифрованным текстом.

### [MODIFY] `infra/home/push-gateway/index.js` (Миграция)
- **Миграционный тайминг (Фаза 4)**: На этапе Sealed Sender вынести `push-gateway` и прокси Rathole на зарубежный VPS. База данных PocketBase остается в РФ.

---

## 7. Стратегия тестирования и развертывания
1. Применить новую схему `pb_schema.json` на dev-БД.
2. Провести рефакторинг фронтенда (устранить ошибки компиляции в мапперах и компонентах).
3. Проверить миграцию профиля (Бизнес <-> Инкогнито) и доставку Blind Push в симуляторе Service Worker.
4. Накатить миграцию на Prod-базу, развернуть зарубежный proxy-шлюз и push-gateway.
