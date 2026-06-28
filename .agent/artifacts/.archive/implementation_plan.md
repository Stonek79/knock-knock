# Рефакторинг архитектуры Media Vault v3 - Ревизия 4 (Functional approach)

В этой ревизии мы полностью отказываемся от классов в пользу функционального подхода и объектов, а также наводим порядок в путях и типизации.

## 1. Отказ от классов (Functional DB)

Вместо `class MediaDB extends Dexie` мы будем использовать фабрику и объект-обертку:
- **База**: Чистый инстанс `Dexie` создается через функциональную фабрику.
- **Интерфейс**: Методы работы с БД (`addReference`, `getWithAccessUpdate`) будут экспортированы как методы объекта-сервиса или возвращаемого инстанса.
- **Типизация**: Строгая типизация таблиц через `z.infer`. Прямое приведение типов разрешено только в месте инициализации `Dexie`.

## 2. Структура типизации (Без Any и Дублей)

1.  **База (PB)**: `MediaRecord` / `MediaResponse`.
2.  **Константы**: `MEDIA_FIELDS` (включая системные поля).
3.  **Схемы (Zod)**: 
    - `mediaSchema` (на базе `MEDIA_FIELDS`).
    - `mediaCacheSchema = mediaSchema.extend(...)` (добавляет поля кэша).
4.  **Типы (TS)**: 
    - `MediaCacheItem = z.infer<typeof mediaCacheSchema>`.
    - `MediaReference = z.infer<typeof mediaReferenceSchema>`.

---

## 3. План реализации

### Фаза 1: Константы и Схемы
- **[MODIFY]** [db.ts](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/constants/db.ts): Дополнение `MEDIA_FIELDS`.
- **[MODIFY]** [storage.ts](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/constants/storage.ts): Константы для Dexie (`SYNC_STATUS`, `REF_TYPE`).
- **[MODIFY]** [media.ts (schemas)](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/schemas/media.ts): 
  - Создание схем `mediaSchema`, `mediaCacheSchema` и `mediaReferenceSchema`.
  - Исправление `mediaWorkerResponseSchema`.

### Фаза 2: Рефакторинг БД (No Classes)
- **[MODIFY]** [media-db.ts](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/mediadb/media-db.ts): 
  - Удаление `class MediaDB`.
  - Реализация `getMediaDB(userId)` как фабрики, возвращающей типизированный объект.
  - Перенос логики транзакций в функциональный стиль.

### Фаза 3: Типы и Сервис
- **[MODIFY]** [media.ts (types)](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/types/media.ts): Очистка и замена на `z.infer`.
- **[MODIFY]** [media.repository.ts](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/repositories/media.repository.ts): Добавление метода `getMediaRecord`.
- **[MODIFY]** [media.ts (service)](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/services/media.ts):
  - Глубокий рефакторинг логики под новую структуру БД.
  - Локализация ошибок (RU).
  - Внедрение `ensureMedia`.

### Фаза 4: Интеграция и Верификация
- **[MODIFY]** [useMedia.ts](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/mediadb/useMedia.ts): Перевод на новый сервис.
- **[VERIFY]** Проверка всех вхождений и типов (tsc, biome).

---

## 4. Верификация No-Any Policy
Все метаданные, которые раньше могли быть `any`, будут типизированы как `unknown` или через специальные схемы (`mediaMetadataSchema`). Любой `return` внутри `if` будет обернут в фигурные скобки.

Уважаемый USER, план обновлен: классы изгнаны, цепочка типов выстроена. Приступаю к Фазе 1?
