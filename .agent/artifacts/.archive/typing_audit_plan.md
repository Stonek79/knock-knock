# План рефакторинга типизации и устранения ошибок (Typing Audit Plan)

## Введение
Анализ 27 ошибок TypeScript показал глубокий рассинхрон между типами PocketBase (`pocketbase-types.ts`), схемами Zod, мапперами и слоем UI. 

## Детальный анализ несоответствий

### 1. Расхождение в именовании связей (Foreign Keys)
**Симптом:**
- Ошибки в `useChatRoomView.ts`, `GroupMembersList/index.tsx` (свойства `user` не существует на типе `ExpandedRoomMember`).
- Ошибка в `optimistic.ts` (свойства `room_id` не существует на типе `ChatMessage`).

**Причина:**
- В PocketBase связи `room_members` называются `user` и `room`. В Zod-схеме `expandedMemberSchema` и маппере мы их переименовали в `user_id` и `room_id`. Однако компоненты UI пытаются читать старые ключи.
- В таблице сообщений (`PBMessage`) поля называются `room` и `sender`. Мы не переименовывали их в маппере `messageMapper.ts`, но `optimistic.ts` пытается подставить `room_id`.

**Решение:**
- **UI Компоненты:** Привести все обращения к свойствам участников к `member.user_id` и `member.room_id`.
- **optimistic.ts:** Вернуть ключи `room` и `sender` для совместимости с `PBMessage`.

### 2. Строгость опциональных полей и Nullability
**Симптом:**
- `store.test.ts`: `Type 'undefined' is not assignable to type 'Attachment[] | null'`.
- `GroupInfoPanel/index.tsx`: `Type '{ profiles: ... | null }' is not assignable to type '{ profiles?: ... }'`.

**Причина:**
- Zod схемы (`expandedMemberSchema`) для вложенных объектов генерируют `.optional()` (`undefined`), в то время как мапперы и интерфейсы могут явно возвращать `null`. В `DecryptedMessage` поля `attachments` жестко типизированы как `| null`.

**Решение:**
- Сделать `profiles` в `expandedMemberSchema` как `.nullable().optional()`.
- В `store.test.ts` передавать `null` вместо `undefined`.

### 3. Сигнатуры сервисов и отсутствующие методы
**Симптом:**
- `RoomService.deleteRoom` ожидает 1 аргумент, передано 2.
- `mediaDb.delete` и `mediaRepository.deleteMediaRecord` не существуют.

**Причина:**
- В процессе рефакторинга методы были либо переименованы (в виде объекта с именованными аргументами), либо еще не реализованы до конца.

**Решение:**
- Хуки: Обновить `useChatActions.ts` на `RoomService.deleteRoom({ roomId, userId: user.id })`.
- `media-db.ts`: Добавить метод `deleteById({ id, userId })`.
- `media.repository.ts`: Реализовать `deleteMediaRecord(id)`.

### 4. Отсутствующие/Удаленные типы и Пропсы
**Симптом:**
- `AddMemberDialog` и `GroupInfoPanel` ругаются на `myUserId: string | undefined`.
- Импорт `ChatType` больше не существует.

**Решение:**
- Хук `useGroupActions` должен корректно работать с `myUserId`, компоненты нужно защитить от `undefined` (рендерить только если есть user).
- В `chatDialogs.ts` заменить `ChatType` на `RoomType` (из констант).

---

## План Действий (Roadmap)

### Шаг 1: Приведение ядра в порядок (Типы и Схемы)
- [ ] Обновить `expandedMemberSchema` в `room.ts` (`profiles` -> `.nullable().optional()`).
- [ ] Проверить `messageMapper.ts`, чтобы он строго отдавал `room` и `sender` (как сейчас).

### Шаг 2: Реализация отсутствующих методов БД
- [ ] Добавить `deleteById` в `app/src/lib/mediadb/media-db.ts`.
- [ ] Добавить `deleteMediaRecord` в `app/src/lib/repositories/media.repository.ts`.

### Шаг 3: Обновление Сервисов и Хуков
- [ ] Исправить вызов `RoomService.deleteRoom` в `useChatActions.ts`.
- [ ] Исправить вызовы в `media.ts` на правильные имена методов `mediaDb` и `mediaRepository`.
- [ ] Исправить тип `myUserId` в `AddMemberDialog.tsx` и `GroupInfoPanel/index.tsx`.
- [ ] Заменить `ChatType` на `RoomType` в `chatDialogs.ts`.

### Шаг 4: Обновление UI-компонентов и моков
- [ ] Заменить `.user` на `.user_id` в `useChatRoomView.ts`.
- [ ] Заменить `.user` на `.user_id` в `GroupMembersList/index.tsx`.
- [ ] Исправить `optimistic.ts` (заменить `room_id` на `room`).
- [ ] Исправить `undefined` на `null` в `store.test.ts`.

Последовательное выполнение этих 4 шагов гарантированно приведет проект к консистентному типизированному состоянию без TS-ошибок.
