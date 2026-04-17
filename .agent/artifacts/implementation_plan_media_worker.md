# План доработки Media Vault v3 — Финальная интеграция

> Дата: 2026-04-15 | 🔴 Критично | 🟡 Архитектура | 🟢 Улучшение

---

## ЭТАП 1 — Инфраструктура: типы и воркер-клиент

### Шаг 1.1 — `app/src/lib/types/media.ts` ✅
**Проблема:** `WorkerMediaPayload` используется в `media.client.ts` и `media.worker.ts`,
но не объявлен в реестре типов и не экспортируется через `types/index.ts`.

**Задача:** Добавить тип:
```ts
export type WorkerMediaPayload = {
  original: Blob;
  thumbnail?: Blob;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    name?: string;
    size?: number;
    mimeType?: string;
  };
};
```

---

### Шаг 1.2 — `app/src/lib/workers/media.client.ts` 🔴
**Проблемы:**
1. `class MediaWorkerClient` — нарушение правила проекта (классы не используются)
2. `postTask` без таймаута — при зависании воркера Promise висит вечно
3. При OOM на большом видео UI зависает на спиннере

**Задача:** Переписать как функциональную фабрику с замыканием:
- `worker` и `pendingTasks: Map` хранятся в замыкании
- В `postTask` добавить `setTimeout(30_000)` → `reject` + удаление из Map
- Экспортировать синглтон: `export const mediaWorkerClient = createMediaWorkerClient()`

---

## ЭТАП 2 — `useMedia`: useEffect → useQuery

### Шаг 2.1 — `app/src/lib/mediadb/useMedia.ts` 🔴
**Проблемы:**
1. `useEffect` — 10 компонентов с одним `mediaId` запускают 10 параллельных запросов
2. Нет дедупликации, staleTime, механизма инвалидации
3. Race condition при скролле списка сообщений
4. `pb.authStore.model?.id` — скрытая зависимость, нарушение явных зависимостей
5. Нет защиты от `roomKey === undefined` при первом рендере

**Задача:** Переписать хук полностью:
- Изменить сигнатуру: добавить `userId: string` как явный параметр
- Заменить `useEffect` на `useQuery`:
  ```ts
  useQuery({
    queryKey: ['media', mediaId, userId],
    queryFn: () => mediaService.ensureMedia({ id: mediaId!, userId, roomKey, isVault }),
    enabled: !!mediaId && !!userId && (!!roomKey || !!isVault),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  })
  ```
- Blob URL создавать в `useMemo`, очищать в `useEffect`-cleanup при смене `data`
- Возвращаемый интерфейс не меняется: `{ objectUrl, thumbnailUrl, isLoading, error }`

---

## ЭТАП 3 — Исправление компонентов отображения

### Шаг 3.1 — `app/src/features/chat/message/components/MessageBubble/index.tsx` 🔴
**Проблема:** Lightbox открывает `img.url` — зашифрованный URL PocketBase.
Пользователь видит ошибку или бинарный мусор вместо изображения.

**Задача:**
- Добавить проп `userId: string` в `MessageBubbleProps`
- При открытии Lightbox — резолвить blob URLs через `mediaService.ensureMedia`
- Создать хук `useLightboxSlides({ attachments, userId, roomKey })`:
  запускается с `enabled: false`, триггерится при клике на изображение
- Убрать `console.log` из кнопок Lightbox toolbar (строки 270, 281)

---

### Шаг 3.2 — `app/src/features/chat/message/components/MessageBubble/components/AttachmentRenderer/index.tsx` 🔴
**Проблемы:**
1. Документы скачиваются через `<a href={att.url}>` — файл зашифрован
2. `CachedImage`, `CachedVideo` не получают `userId`

**Задача:**
- Добавить `userId: string` в `AttachmentRendererProps` → пробросить в `CachedImage`, `CachedVideo`
- Для документов заменить `<a href>` на `<button>` с обработчиком:
  ```ts
  async function handleDocumentDownload() {
    const result = await mediaService.ensureMedia({ id: att.id, userId, roomKey });
    if (result.isOk() && result.value.original) {
      const url = URL.createObjectURL(result.value.original);
      const link = document.createElement('a');
      link.href = url;
      link.download = att.file_name;
      link.click();
      URL.revokeObjectURL(url);
    }
  }
  ```

---

### Шаг 3.3 — `app/src/features/chat/message/components/AudioMessagePlayer/index.tsx` 🟡
**Задача:** Добавить проп `userId: string` → пробросить в `useAudioPlayer`

---

### Шаг 3.4 — `app/src/features/chat/message/hooks/useAudioPlayer.ts` 🟡
**Проблемы:**
1. Нет `userId` в параметрах → не передаётся в `useMedia`
2. Fallback `src` — воспроизводит зашифрованный файл при отсутствии blob

**Задача:**
- Добавить `userId: string` в `UseAudioPlayerParams`
- Передавать в `useMedia({ mediaId, userId, roomKey })`
- Изменить fallback логику:
  ```ts
  // Было: decryptedSrc || (src.startsWith('blob:') ? src : undefined)
  // Стало: во время загрузки → undefined (плеер отключён), после ошибки → null (показать ошибку)
  decryptedSrc: isLoading ? undefined : (decryptedSrc ?? null)
  ```

---

## ЭТАП 4 — Исправление логики отправки

### Шаг 4.1 — `app/src/features/chat/message/hooks/useSendMessage.ts` 🟡
**Проблемы:**
1. Дублирование `_getFileType` логики (строки 115–119 и 199–203) — оба места
   повторяют то, что уже есть в `mediaService._getFileType()`
2. Прямой импорт `mediaRepository` в UI-хук — нарушение слоёв:
   - строка 11: `import { mediaRepository } from "@/lib/repositories/media.repository"`
   - строка 99: `url: mediaRepository.getFileUrl({...})` — URL до загрузки
   - строка 133: `url: mediaRepository.getFileUrl({...})` — URL основного файла
   - строка 138: `url: mediaRepository.getFileUrl({...})` — URL thumbnail
3. Все 3 вызова `getFileUrl` возвращают зашифрованные PocketBase URL — они не должны
   попадать в UI, пока не пройдут через `mediaService.ensureMedia`

**Задача:**
- Удалить импорт `mediaRepository` полностью
- Заменить дублирующую логику на `mediaService._getFileType(mime)`
- Заменить все 3 вызова `mediaRepository.getFileUrl` на получение blob URL из кэша:
  после `uploadMedia` сервис уже сохранил `original` blob в Dexie;
  читать через `mediaDb.getWithAccessUpdate({ id, userId })` и создавать `URL.createObjectURL(blob)`,
  добавлять в `blobUrls` массив для cleanup в `onSettled`
- В оптимистичном обновлении (строка 99) URL формировать из локального blob File:
  `URL.createObjectURL(file)` → добавить в `blobUrls` для cleanup

---

### Шаг 4.2 — `app/src/features/chat/message/hooks/useFileAttachments.ts` 🟡
**Проблема:** Проверка "одно видео" (строки 56–63) не работает при мультиселекте файлов.

**Задача:** Заменить логику валидации:
```ts
// Считаем ДО filter, на всём массиве selectedFiles
const incomingVideos = selectedFiles.filter(f => f.type.startsWith(MIME_PREFIXES.VIDEO)).length;
const existingVideos = attachments.filter(a => a.type.startsWith(MIME_PREFIXES.VIDEO)).length;
if (incomingVideos + existingVideos > 1) {
  toast({ title: t("chat.onlyOneVideoAllowed", "Только одно видео на сообщение"), variant: "error" });
  return;
}
```

---

## ЭТАП 5 — Проброс `userId` через дерево компонентов

### Шаг 5.1 — Цепочка пропсов 🟡
Поскольку `useMedia` теперь требует явный `userId`, добавить его сверху вниз:

```
ChatRoom (user из useChatRoomData)
  → MessageList → [userId]
    → MessageBubble → [userId]
      → AttachmentRenderer → [userId]
        → CachedImage → [userId → useMedia]
        → CachedVideo → [userId → useMedia]
        → AudioMessagePlayer → [userId]
          → useAudioPlayer → [userId]
            → useMedia → [userId]
```

**Файлы для изменения:**
- `features/chat/room/.../ChatRoomMessages/index.tsx` — передать `userId` в `MessageList`
- `features/chat/message/components/MessageList/index.tsx` — передать в `MessageBubble`
- `MessageBubble/index.tsx` — добавить проп, передать в `AttachmentRenderer`
- `AttachmentRenderer/index.tsx` — добавить проп, передать в дочерние
- `AudioMessagePlayer/index.tsx` — добавить проп, передать в хук

---

## ЭТАП 6 — Верификация

### Шаг 6.1 — TypeScript
```bash
./node_modules/.bin/tsc -p tsconfig.json --noEmit
```
Ожидаем: 0 ошибок.

### Шаг 6.2 — Biome
```bash
./node_modules/.bin/biome check src/
```
Ожидаем: 0 ошибок.

### Шаг 6.3 — Ручное тестирование в браузере
- [ ] Отправить изображение → мгновенно появляется из кэша (blob URL)
- [ ] Открыть Lightbox → изображение корректное, не зашифрованное
- [ ] Перезагрузить страницу → изображение грузится из Dexie, не с сервера
- [ ] Отправить документ → скачивается расшифрованный файл
- [ ] Голосовое сообщение → воспроизводится, плеер не показывает ошибку
- [ ] Мультиселект 2 видео → показывается ошибка валидации
- [ ] Медленная сеть → скелетон без UI freeze

---

## Сводная таблица

| Файл | Изменение | Этап | Приоритет |
|------|-----------|------|-----------|
| `lib/types/media.ts` | Добавить `WorkerMediaPayload` | 1.1 | 🔴 |
| `lib/workers/media.client.ts` | Класс → фабрика + таймаут | 1.2 | 🔴 |
| `lib/mediadb/useMedia.ts` | useEffect → useQuery + `userId` param | 2.1 | 🔴 |
| `components/MessageBubble/index.tsx` | `userId` prop + Lightbox fix | 3.1 | 🔴 |
| `components/AttachmentRenderer/index.tsx` | `userId` prop + doc download fix | 3.2 | 🔴 |
| `components/AudioMessagePlayer/index.tsx` | `userId` prop | 3.3 | 🟡 |
| `hooks/useAudioPlayer.ts` | `userId` param + fallback fix | 3.4 | 🟡 |
| `hooks/useSendMessage.ts` | DRY + удалить `mediaRepository` + заменить 3x `getFileUrl` на blob URL из кэша | 4.1 | 🟡 |
| `hooks/useFileAttachments.ts` | Валидация видео при мультиселекте | 4.2 | 🟡 |
| `ChatRoomMessages`, `MessageList` | Проброс `userId` | 5.1 | 🟡 |
