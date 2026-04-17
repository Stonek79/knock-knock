# План реализации: Медиасистема v3

## Цель: Переход на Dexie.js, Web Worker (compression + encryption)

### [x] Этап 1: Подготовка (Константы и Типы)
- Созданы Zod-схемы загрузки с Zod v4 (custom code, error string parameters) + i18n JSON serialization.
- Добавлены лимиты и списки `MEDIA_WORKER_ACTIONS` в константы.
- Настроен `app/src/lib/types/media.ts` с выведением интерфейсов задач Воркера и связи с БД (`MediaTypeOptions`).

### [ ] Этап 2: Web Worker (Media Processor)
- Сжатие изображений (OffscreenCanvas).
- Шифрование AES-GCM (Zero Knowledge).
- Паковка/компрессия видео (mp4-muxer) если возможно, либо проброс.
- Настройка `postMessage` для взаимодействия с `media.service`.

### [ ] Этап 3: База данных (Dexie)
- Миграция с idb-keyval на IndexedDB.
- Логика очистки старого кэша (TTL + Favorites protection).

### [ ] Этап 4: Интеграция
- Перенос `uploadMedia.ts` из фич в `lib/services/media.service.ts`.
- Обновление хука `useSendMessage` для использования сервиса.
