# Уточненный план реализации: Media System v3 (Phase 2)

Данный план заменяет предыдущие наброски и строго следует правилам чистого кода проекта.

## Статус: [ВЫПОЛНЕНО]

### 1. Схемы и Типы
- **[DONE] schemas/media.ts**:
  - Обновить `mediaWorkerResponseSchema` для возврата нескольких Payload.
  - Локализация всех строк ошибок на русский.
  - Добавлены строгие схемы валидации Zod для Lightbox-слайдов (`lightboxSlideSchema`, `lightboxVideoSlideSchema`, `lightboxImageSlideSchema`).
- **[DONE] types/media.ts**:
  - Автоматическая синхронизация типов через `z.infer`.
  - Экспортированы чистые доменные типы `LightboxSlide`, `LightboxImageSlide`, `LightboxVideoSlide` без костылей и заглушек.

### 2. Сервис обработки (Main Thread)
- **[DONE] services/media.ts**:
  - Класс `Media` (экспорт инстанса `media`).
  - Логика взаимодействия с `Worker`.
  - Извлечение кадра видео через `document.createElement('video')`.
  - Использование `Transferable Objects` (ImageBitmap) для оптимизации передачи данных в воркер.

### 3. Обработчик (Web Worker)
- **[DONE] workers/media.worker.ts**:
  - Импорт констант из `constants/storage.ts` напрямую.
  - Валидация каждой задачи через `mediaWorkerTaskSchema.parse()`.
  - Реализация `COMPRESS_IMAGE` (OffscreenCanvas + WebP).
  - Реализация `ENCRYPT_BLOB` (AES-GCM через `subtleProvider`).
  - Реализация `MUX_VIDEO` (шифрование видео + обработка переданного кадра превью).

### 4. UI и Устранение багов Safari/iOS
- **[DONE] AttachmentRenderer / MessageBubble**:
  - Видео в чате проигрывается беззвучно при попадании в зону видимости (IntersectionObserver 50%+).
  - При клике на видео открывается полноэкранный плеер в Лайтбоксе (через официальный VideoPlugin) со звуком и контролами.
  - Устранена ошибка двойного клика в Safari, вызванная динамическим сбросом хэша `#t=0.001` в React.
  - Выделение сообщений полностью сохранено.

## Верификация
- **Node/Vitest**: Тестирование логики шифрования внутри воркера.
- **Браузер**: Мануальное тестирование загрузки/сжатия через DevTools (просмотр зашифрованных чанков в IndexedDB), проверка автоплея и воспроизведения видео в Safari и Chrome.
