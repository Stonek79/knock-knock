# Обновленный план реализации: Рефакторинг страницы рассылок (Стиль чата + AlertDialog)

## Цели
1. **Кастомный AlertDialog**: Заменить `window.confirm` на Radix UI `AlertDialog`.
2. **Разделение компонентов**: Выделить создание рассылки (ввод) и список рассылок (историю) в отдельные компоненты.
3. **UX как в чате**: Изменить расположение элементов — заголовок сверху, список сообщений (история) в середине (занимает всё свободное место с прокруткой `overflow-y: auto`), поле ввода сообщений зафиксировано в самом низу.

---

## Варианты решения

### Вариант 1 (Рекомендуемый): Полное разделение на микро-компоненты
* **Описание**: Создаем структуру папок внутри `app/src/features/admin/Broadcast/`:
  * `components/DeleteBroadcastDialog/index.tsx` — модалка удаления на основе `AlertDialog`.
  * `components/BroadcastHeader/index.tsx` — верхняя панель с заголовком и описанием рассылок.
  * `components/BroadcastHistory/index.tsx` — прокручиваемый список сообщений (история) с рендером `MessageBubble` и кнопкой удаления.
  * `components/BroadcastInput/index.tsx` — закрепленная снизу панель ввода (`MessageInput` + статус отправки/ошибки).
  * `index.tsx` — оркестратор страницы, управляющий стейтами, загрузкой и колбэками.
* **Плюсы**:
  * Идеальная модульная структура и чистота кода.
  * Полное соответствие UX чата (инпут снизу, сообщения сверху).
  * Удобно поддерживать и стилизовать.
* **Минусы**:
  * Создание 4-х новых файлов.

### Вариант 2: Частичное разделение (только форма ввода и список истории)
* **Описание**: Создаем только два файла компонентов: `BroadcastInputForm.tsx` и `BroadcastHistoryList.tsx`. Модалка AlertDialog рендерится внутри основного `index.tsx`.
* **Плюсы**:
  * Меньше файлов, чем в Варианте 1.
* **Минусы**:
  * Логика диалога удаления смешивается со страницей.

### Вариант 3: Переверстка без разделения компонентов (всё в одном файле)
* **Описание**: Оставляем весь код в одном файле `Broadcast/index.tsx`, но переписываем CSS и HTML под структуру чата.
* **Плюсы**:
  * Минимум изменений по файлам.
* **Минусы**:
  * Нарушает требование разделить компоненты создания и списка рассылок.
  * Сложный для поддержки файл (~350+ строк).

---

## Детальный план реализации (на основе Варианта 1)

### Шаг 1. Создание `DeleteBroadcastDialog`
Создаем файл [DeleteBroadcastDialog/index.tsx](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/features/admin/Broadcast/components/DeleteBroadcastDialog/index.tsx):
* Использует `AlertDialog` из `@/components/ui/AlertDialog` и `Button`.
* Принимает `open: boolean`, `onOpenChange: (open: boolean) => void`, `onConfirm: () => void`.

### Шаг 2. Создание `BroadcastHeader`
Создаем файл [BroadcastHeader/index.tsx](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/features/admin/Broadcast/components/BroadcastHeader/index.tsx):
* Рендерит иконку `Megaphone`, заголовок и описание рассылок.
* Будет служить шапкой "чата рассылок".

### Шаг 3. Создание `BroadcastHistory`
Создаем файл [BroadcastHistory/index.tsx](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/features/admin/Broadcast/components/BroadcastHistory/index.tsx):
* Принимает список `history` (`TaskQueueResponse[]`), `onDelete` (`(id: string) => void`) и `isLoadingHistory` (`boolean`).
* Рендерит сообщения через `MessageBubble`, обернутые в контейнеры, с кнопкой удаления `Trash2`.
* Имеет собственный класс скролла, прокручивающийся вертикально.

### Шаг 4. Создание `BroadcastInput`
Создаем файл [BroadcastInput/index.tsx](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/features/admin/Broadcast/components/BroadcastInput/index.tsx):
* Принимает `onSend`, `isLoading`, `status` (для вывода сообщений об успехе/ошибке).
* Рендерит `MessageInput` и блок статуса.

### Шаг 5. Обновление `Broadcast/index.tsx` и стилей `broadcast-settings.module.css`
* В [index.tsx](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/features/admin/Broadcast/index.tsx):
  * Храним стейты `deleteTaskId`, `isLoading`, `status`.
  * Реализуем колбэки `handleSend` и `handleDelete`.
  * Собираем все компоненты в макет:
    ```tsx
    <div className={styles.container}>
        <BroadcastHeader />
        <BroadcastHistory ... />
        <BroadcastInput ... />
        <DeleteBroadcastDialog ... />
    </div>
    ```
* В [broadcast-settings.module.css](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/features/admin/Broadcast/broadcast-settings.module.css):
  * Меняем макет на `display: flex; flex-direction: column; height: 100vh` (или 100% высоты родителя, учитывая шапку).
  * Фиксируем инпут внизу, а истории даем `flex: 1; overflow-y: auto;`.

### Шаг 6. Проверка типов и линтинг
* Обязательно оборачиваем все `return` в `if` блоках в фигурные скобки `{}`.
* Запуск `npx biome check --write` в папке `app`.
* Запуск `npx tsc --noEmit` в папке `app`.

Есть ли у вас замечания или предложения к этому плану?
