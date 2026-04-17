# Уточненный план реализации: Media System v3 (Phase 2)

Данный план заменяет предыдущие наброски и строго следует правилам чистого кода проекта.

## Предлагаемые изменения

### 1. Схемы и Типы
- **[MODIFY] schemas/media.ts**:
  - Обновить `mediaWorkerResponseSchema` для возврата нескольких Payload.
  - Локализация всех строк ошибок на русский.
- **[MODIFY] types/media.ts**:
  - Автоматическая синхронизация типов через `z.infer`.

### 2. Сервис обработки (Main Thread)
- **[NEW] services/media.ts**:
  - Класс `Media` (экспорт инстанса `media`).
  - Логика взаимодействия с `Worker`.
  - Извлечение кадра видео через `document.createElement('video')`.
  - Использование `Transferable Objects` (ImageBitmap) для оптимизации передачи данных в воркер.

### 3. Обработчик (Web Worker)
- **[UPDATE] workers/media.worker.ts**:
  - Импорт констант из `constants/storage.ts` напрямую.
  - Валидация каждой задачи через `mediaWorkerTaskSchema.parse()`.
  - Реализация `COMPRESS_IMAGE` (OffscreenCanvas + WebP).
  - Реализация `ENCRYPT_BLOB` (AES-GCM через `subtleProvider`).
  - Реализация `MUX_VIDEO` (шифрование видео + обработка переданного кадра превью).

## Верификация
- **Node/Vitest**: Тестирование логики шифрования внутри воркера.
- **Браузер**: Мануальное тестирование загрузки/сжатия через DevTools (просмотр зашифрованных чанков в IndexedDB).
