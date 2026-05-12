# Диагноз и план: превью сообщений в списке чатов

## Решение согласовано
Убрать pointer-поля из логики, вычислять «живое» последнее сообщение напрямую из messages.
Для всех CRUD-операций с сообщениями — инвалидировать кэш rooms через React Query.

---

## Корень проблемы

Два «указателя» в БД (`rooms.last_message` и `room_members.last_message`) —
мутируемый кэш, который требует ручного обновления после каждой мутации.
Это источник всех ошибок: 400, 404, race conditions, десинхронизация.

`rooms.last_message` — **неправильная абстракция**: «последнее» индивидуально для каждого
участника. `room_members.last_message` — полезен только как hint для expand, но устаревает
при любом удалении и требует болезненной ручной синхронизации.

**Решение**: не хранить, а вычислять. При загрузке списка чатов — делать параллельный
запрос к `messages` с фильтрами видимости для текущего пользователя.

---

## Анализ текущих хуков

| Хук | Что делает сейчас с rooms-кэшем | Что нужно |
|-----|---------------------------------|-----------|
| `useSendMessage` | `onMutate`: оптимистично пишет в rooms-кэш; `onSuccess`: обновляет id; `onSettled`: **НЕ инвалидирует** rooms (комментарий «избежать прыжка») | После нашего рефакторинга: инвалидировать rooms в `onSettled` |
| `useChatActions.deleteMessage` | Инвалидирует `rooms(user.id)` ✅ | Уже ок, останется |
| `useChatActions.updateMessage` | **Ничего** с rooms не делает ❌ | Добавить инвалидацию rooms |
| `useChatActions.endSession` | Инвалидирует rooms при удалении эфемерной комнаты ✅ | Добавить инвалидацию при очистке истории (clearRoom) |

---

## План реализации

### Шаг 1 — Добавить `getLastVisibleMessageBatch` в `messageRepository`

```typescript
// app/src/lib/repositories/message.repository.ts
getLastVisibleMessageBatch: async (
    roomIds: string[],
    userId: string,
): Promise<Result<Map<string, MessageRow>, MessageRepoError>> => {
    if (roomIds.length === 0) {
        return ok(new Map());
    }

    // Параллельные запросы — по одному на каждую комнату
    const entries = await Promise.all(
        roomIds.map(async (roomId) => {
            const result = await messageRepository.getLatestMessage(roomId, userId);
            const msg = result.isOk() ? result.value : null;
            return [roomId, msg] as const;
        }),
    );

    const map = new Map<string, MessageRow>(
        entries.filter((e): e is [string, MessageRow] => e[1] !== null),
    );
    return ok(map);
},
```

`getLatestMessage` уже реализован и корректно фильтрует:
`is_deleted = false && deleted_by !~ userId`

### Шаг 2 — Обновить `roomRepository.getUserRooms`

После загрузки комнат — отдельным шагом загружаем последние видимые сообщения:

```typescript
getUserRooms: async (userId: string): Promise<Result<RoomWithMembers[], RoomRepoError>> => {
    // 1. Члены → ID комнат
    const membersResult = await roomRepository.getRoomMembersByUserId(userId);
    if (membersResult.isErr()) return err(membersResult.error);

    const roomIds = membersResult.value.map(m => m.room);
    if (roomIds.length === 0) return ok([]);

    // 2. Комнаты (БЕЗ expand last_message)
    const roomsResult = await roomRepository.getRoomsWithMembersByIds(roomIds, userId);
    if (roomsResult.isErr()) return err(roomsResult.error);

    // 3. Батч-загрузка последних видимых сообщений
    const lastMsgsResult = await messageRepository.getLastVisibleMessageBatch(roomIds, userId);
    const lastMsgs = lastMsgsResult.isOk() ? lastMsgsResult.value : new Map();

    // 4. Инжектируем в доменные модели
    return ok(
        roomsResult.value.map(room => ({
            ...room,
            last_message: lastMsgs.get(room.id) ?? null,
        })),
    );
},
```

### Шаг 3 — Убрать expand `last_message` из запроса комнат

В `roomRepository.getRoomsWithMembers()` убрать из expand-пути:
- `DB_EXPAND.LAST_MESSAGE`
- `` `${DB_EXPAND.MEMBERS}.${ROOM_MEMBER_FIELDS.LAST_MESSAGE}` ``

```typescript
// Было:
const expandPath = [
    DB_EXPAND.MEMBERS,
    `${DB_EXPAND.MEMBERS}.${ROOM_MEMBER_FIELDS.LAST_MESSAGE}`,
    DB_EXPAND.LAST_MESSAGE,
].join(",");

// Стало:
const expandPath = DB_EXPAND.MEMBERS;  // только участники
```

### Шаг 4 — Упростить `RoomMapper.toDomain`

Убрать всю логику выбора превью (`isValid`, `memberMsg`, `globalMsg`, `history_cutoff`).
Маппер просто пробрасывает `last_message: null` — его заполняет репозиторий:

```typescript
const domainRoom: RoomWithMembers = {
    ...record,
    last_message: null,        // заполняется в getUserRooms через batch
    room_members: members,
};
```

### Шаг 5 — Упростить `MessageService.deleteMessage`

Убрать весь код обновления указателей (getRoomMembers, getLatestMessage в цикле,
updateMember, updateRoom, batch). Оставить только:

```typescript
// Глобальное удаление (своё / admin):
await messageRepository.updateMessage(messageId, {
    content: "", iv: "", is_deleted: true, metadata: { ... }
});

// Персональное скрытие (чужое):
await messageRepository.hideMessageForMe(messageId, currentUserId);

// Медиа-кэш:
await mediaDb.deleteByMessageId({ messageId, userId: currentUserId });

return ok(undefined);
```

### Шаг 6 — Добавить инвалидацию rooms во все CRUD-хуки

#### `useSendMessage` — `onSettled`
Сейчас: НЕ инвалидирует rooms (боялись «прыжка»).
После рефакторинга `getUserRooms` будет возвращать актуальные данные — прыжка не будет.

```typescript
onSettled: (_data, _error, _variables, context) => {
    // ... очистка blobUrls ...
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages(roomId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rooms(pbUser?.id) }); // ← добавить
},
```

Оптимистичный `setQueryData` в `onMutate` / `onSuccess` **оставить** — он даёт мгновенный
отклик UI. Инвалидация в `onSettled` просто синхронизирует с сервером.

#### `useChatActions.deleteMessage`
Уже инвалидирует rooms ✅ — без изменений.

#### `useChatActions.updateMessage`
Сейчас: ничего не делает с rooms ❌.

```typescript
if (result.isOk()) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rooms(user?.id) }); // ← добавить
}
```

#### `useChatActions.endSession` — при `clearRoom`
```typescript
const clearResult = await MessageService.clearRoom(roomId, user.id);
if (clearResult.isOk()) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rooms(user.id) }); // ← добавить
}
```

---

## Что убираем

| Что | Откуда |
|-----|--------|
| Весь batch/updateMember/updateRoom код | `MessageService.deleteMessage()` |
| `isValid()`, `memberMsg`, `globalMsg`, `history_cutoff` фильтрация | `RoomMapper.toDomain()` |
| expand `last_message` (глобальный и персональный) | `roomRepository.getRoomsWithMembers()` |
| `import { pb }` и `DB_TABLES` | `MessageService` (если не нужны для другого) |
| `last_message_id` из доменной модели | `RoomWithMembers` тип + маппер |

## Что добавляем

| Что | Куда |
|-----|------|
| `getLastVisibleMessageBatch()` | `messageRepository` |
| Вызов batch-загрузки сообщений после getRooms | `roomRepository.getUserRooms()` |
| `invalidateQueries(rooms)` в `onSettled` | `useSendMessage` |
| `invalidateQueries(rooms)` при успехе | `useChatActions.updateMessage` |
| `invalidateQueries(rooms)` после clearRoom | `useChatActions.endSession` |

---

## Итоговый поток данных (целевой)

```
LOAD:
useChatList → getUserRooms(userId)
  → getRoomsWithMembersByIds()         // комнаты + участники (NO expand last_message)
  → getLastVisibleMessageBatch()       // last msg per room для userId (параллельно)
  → merge → RoomWithMembers[]
  → mapRoomToChatItem() → ChatListItem

SEND:
useSendMessage.onMutate  → setQueryData(rooms) — оптимистично
useSendMessage.onSuccess → setQueryData(rooms) — заменяем tempId на serverId
useSendMessage.onSettled → invalidateQueries(rooms) — синхронизируем с сервером

DELETE:
deleteMessage() → MessageService (только soft delete / hideForMe + media cleanup)
             → invalidateQueries(rooms) — список сам перезапросит актуальные данные

EDIT:
updateMessage() → MessageService (шифрование + update)
              → invalidateQueries(rooms) — если редактировали последнее сообщение

CLEAR ROOM:
endSession() → MessageService.clearRoom()
           → invalidateQueries(rooms)
```

---

## Поля в БД (rooms, room_members)

`rooms.last_message` и `room_members.last_message` — **оставить в схеме**, но перестать
использовать в логике. Поля постепенно протухнут и не будут мешать. Удалить через
отдельную миграцию по необходимости.
