# План реализации: Починка статусов прочтения, времени вложений и скролла к непрочитанным (Баг 2.4)

Этот план описывает шаги по интеграции полноценных статусов прочтения сообщений в БД, отображению метаданных (галочки и время) для всех типов вложений и скроллу к первому непрочитанному сообщению при открытии чата.

## 1. Скролл к последнему непрочитанному сообщению (как в Telegram)
* **Файл:** `app/src/features/chat/room/hooks/useChatScroll.ts`
* **Действие:**
  * Добавить `firstUnreadId?: string | null` в пропсы хука `UseChatScrollProps`.
  * Внутри `useLayoutEffect` при `isFirstLoad === true` проверять наличие `firstUnreadId`.
  * Если `firstUnreadId` передан, найти DOM-элемент сообщения `[data-message-id="${firstUnreadId}"]` внутри viewport.
  * Если элемент найден, скроллить к нему через `unreadElement.scrollIntoView({ block: "start" })`. После скролла вычислить и обновить состояние `isAtBottomRef.current` и `showScrollButton`.
  * Если непрочитанных нет — скроллить в самый низ (`scrollToBottom("auto")`).
* **Файл:** `app/src/features/chat/message/components/MessageList/index.tsx`
  * Передать `firstUnreadId` в вызов хука `useChatScroll`.

## 2. Пометка сообщений прочитанными в БД PocketBase
* **Файл:** `app/src/features/chat/message/hooks/useUnreadTracking.ts`
* **Действие:**
  * Импортировать `MessageService` из `@/lib/services/message`.
  * В методе `markAsRead` при успешном вызове `roomRepository.updateMember` также вызывать `MessageService.markMessagesAsRead(roomId, pbUser.id)`. Это обновит статус всех полученных сообщений в комнате на `read` в PocketBase.
* **Файл:** `app/src/lib/services/chat-realtime.ts`
  * В методе `handleMessageEvent` для события `CREATE` от собеседника проверять, открыта ли сейчас эта комната (`_activeRoomId === record.room`).
  * Если комната открыта, автоматически помечать новое сообщение как прочитанное в БД с помощью `MessageService.markMessagesAsRead` и обновлять `last_read_at` участника в фоне, чтобы отправитель сразу получал статус `read` (две галочки) в реальном времени.

## 3. Исправление отображения галочек и времени для видео, галерей и файлов
* **Файл:** `app/src/features/chat/message/components/MessageBubble/index.tsx`
* **Действие:**
  * Переименовать `isImageOnly` в `isMediaOnly` и расширить его проверку на видео:
    ```typescript
    const isMediaOnly =
        !content &&
        attachments?.length === 1 &&
        (attachments[0].type === ATTACHMENT_TYPES.IMAGE ||
         attachments[0].type === ATTACHMENT_TYPES.VIDEO) &&
        !isDeleted;
    ```
  * В разметке Bubble использовать `isMediaOnly` для применения стиля `styles.bubbleImageOnly` и оверлея `styles.metadataOverlay`.
  * Добавить условие для рендеринга обычного блока метаданных `metadataContent`, если у сообщения нет текста и это не одиночный медиафайл (для галерей, документов или аудио без текста):
    ```typescript
    {!isDeleted && !content && !isMediaOnly && (
        <Box className={styles.metadata}>{metadataContent}</Box>
    )}
    ```

## 4. Проверка и верификация кода
* **Действие:**
  * Запустить линтер Biome: `npx biome lint app/src/`
  * Запустить компилятор TS для проверки типов: `npm run typecheck`
  * Проверить в браузере:
    1. Позиционирование скролла при входе в чат с непрочитанными сообщениями.
    2. Отображение галочек и времени на видео, файлах и галереях без текста.
    3. Изменение статуса сообщения на "прочитано" (две галочки) у отправителя при открытии чата получателем.
