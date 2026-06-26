# План реализации: Замена confirm на AlertDialog и исправление подгрузки пользователей

## Проблема 1: Использование `window.confirm` при удалении рассылки
Текущая реализация использует нативный `window.confirm`, что нарушает требования к UI/UX и дизайну приложения. Необходимо заменить его на кастомный `AlertDialog` на основе Radix UI, который уже есть в проекте.

## Проблема 2: Список пользователей в админке не подгружается при первом входе (без поискового запроса)
На сервере в файле `infra/home/pb_hooks/main.pb.js` при пустом `q` (поисковом запросе) для администратора вызывается:
`$app.findRecordsByFilter("users", "", "-created", 50, 0)`
Пустой фильтр `""` в PocketBase вызывает ошибку `Filter expression cannot be empty`, из-за чего сервер возвращает ошибку `500 Internal Server Error`.

---

## Варианты решения

### Вариант 1: Встраивание AlertDialog непосредственно в Broadcast/index.tsx
* **Описание**: Добавляем состояние `const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);` прямо в `Broadcast/index.tsx`. Там же рендерим разметку `AlertDialog`.
* **Исправление бэкенда**: Заменяем `""` в `findRecordsByFilter` на `"id != ''"`.
* **Плюсы**:
  * Быстрая реализация.
  * Все изменения локализованы в одном файле.
* **Минусы**:
  * Засоряет основной компонент `Broadcast` разметкой модального окна.

### Вариант 2 (Рекомендуемый): Создание отдельного компонента `DeleteBroadcastDialog`
* **Описание**: Создаем выделенный компонент `DeleteBroadcastDialog` в новой папке `app/src/features/admin/Broadcast/components/DeleteBroadcastDialog/index.tsx`. Он будет использовать Radix-компоненты `AlertDialog` и принимать пропсы `open`, `onOpenChange`, `onConfirm`. Логика вызова останется в `Broadcast/index.tsx`.
* **Исправление бэкенда**: Заменяем `""` в `findRecordsByFilter` на `"id != ''"`.
* **Плюсы**:
  * Чистая архитектура, следующая стилю проекта (аналогично `DeleteConfirmDialog` для сообщений).
  * Разметка модалки изолирована от логики страницы.
  * Легко тестировать и поддерживать.
* **Минусы**:
  * Создание одного дополнительного файла.

### Вариант 3: Обобщенный универсальный диалог подтверждения удаления для всей админки
* **Описание**: Разработка единого компонента `AdminConfirmDialog`, который принимает заголовки, описание и колбэк подтверждения, и переиспользование его везде в админке.
* **Исправление бэкенда**: Аналогично.
* **Плюсы**:
  * Максимальная переиспользуемость.
* **Минусы**:
  * Овер-инжиниринг для текущей задачи (пока подтверждение нужно только в одном месте админки).

---

## Детальный план реализации (на основе Варианта 2)

### Шаг 1. Исправление серверного хука
В файле [main.pb.js](file:///Users/alexstone/WebstormProjects/knock-knock/infra/home/pb_hooks/main.pb.js) на строке 997 заменяем пустую строку фильтра на `"id != ''"`:
```javascript
const users = $app.findRecordsByFilter("users", "id != ''", "-created", 50, 0);
```

### Шаг 2. Создание компонента `DeleteBroadcastDialog`
Создаем файл [DeleteBroadcastDialog/index.tsx](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/features/admin/Broadcast/components/DeleteBroadcastDialog/index.tsx) со следующей структурой:
* Использование `AlertDialog.Root`, `AlertDialog.Content`, `AlertDialog.Title`, `AlertDialog.Description`, `AlertDialog.Cancel`, `AlertDialog.Action`.
* Локализованные тексты подтверждения удаления рассылки.
* Любой `return` внутри блока `if` оборачиваем в фигурные скобки.

### Шаг 3. Интеграция диалога в `BroadcastPage`
В файле [Broadcast/index.tsx](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/features/admin/Broadcast/index.tsx):
* Добавляем стейт `const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);`.
* Удаляем вызов `window.confirm`.
* Заменяем вызов `handleDelete(item.task_key)` на `setDeleteTaskId(item.task_key)`.
* Рендерим `<DeleteBroadcastDialog open={deleteTaskId !== null} onOpenChange={(open) => !open && setDeleteTaskId(null)} onConfirm={...} />`.
* Проверяем форматирование `if` (фигурные скобки у `return`).

### Шаг 4. Проверка и линтинг
* Запуск `npx biome check --write` в папке `app/` для проверки форматирования и линтинга.
* Запуск `tsc --noEmit` в папке `app/` для проверки типов.
* Проверка работоспособности.

---
Есть ли у вас замечания или предложения к этому плану?
