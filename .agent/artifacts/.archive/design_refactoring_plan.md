# План рефакторинга дизайн-системы Knock-Knock

Этот документ описывает пошаговый план рефакторинга дизайн-системы. Главные цели:
1. Разбить монолитный `index.css` на модульную структуру.
2. Создать единый, непротиворечивый словарь токенов для всех тем (Default, Neon, Emerald).
3. Избавиться от legacy-токенов (наследие Radix Themes: `--blue-3`, `--ruby-9` и т.д.) и хардкодных fallback-цветов (например, `#ef4444`, `grey`, `aqua`).
4. Бесшовно перевести все React-компоненты на использование новых семантических токенов внутри CSS Modules, ничего не сломав.

---

## 1. Анализ текущего состояния
- Стили хранятся в огромном `app/src/index.css` (738 строк), где смешаны статические токены, все 3 темы, глобальные стили и алиасы.
- Во многих компонентах (`features`, `components/ui`, `pages`) используются удалённые токены Radix Themes:
  - `--accent-9`, `--slate-4`, `--blue-3`, `--amber-3`, `--orange-11`, `--green-9`, `--ruby-9`, `--red-9` и т.д.
  - Поскольку Radix Themes был удалён, эти цвета либо берутся из `index.css` (в секции `Legacy Compat` прописаны только часть: `--gray-*`, `--accent-*`), либо не работают вообще (transparent), либо используют хардкодные фолбэки (например, `var(--color-error, #ef4444)` в `documentattachmentcard.module.css`).
- В `app/src/config/settings.ts` используются строковые хардкод-цвета для иконок (`"blue"`, `"aqua"`, `"red"`, `"grey"`), которые передаются через `style={{ color: item.color }}`.

---

## 2. Новая архитектура стилей
Создать директорию `app/src/styles/` со следующей структурой:
```text
app/src/styles/
├── tokens/               # Статические токены (не зависят от темы)
│   ├── spacing.css       # --space-*, --scale-factor
│   ├── typography.css    # --text-*, --font-weight-*
│   ├── radius.css        # --radius-*
│   ├── sizes.css         # --size-* (icons, avatars, layout)
│   ├── z-index.css       # --z-*
│   └── animation.css     # --transition-*, keyframes
├── themes/               # Токены, зависящие от тем (light/dark)
│   ├── base.css          # Нейтральные фолбэки, общие переменные и Legacy-алиасы (на время миграции)
│   ├── default.css       # [data-theme="default"]
│   ├── neon.css          # [data-theme="neon"]
│   └── emerald.css       # [data-theme="emerald"]
├── global.css            # Сброс, scrollbar, body, утилитные классы (.premium-button)
└── index.css             # Точка входа (только @import всех вышеперечисленных)
```

---

## 3. Единый словарь семантических токенов
Вместо конкретных названий цветов (blue, ruby, amber) вводится система намерений (Intents). В `themes/base.css` и в каждой теме необходимо определить:

```css
/* Поверхности (Surfaces) */
--bg-app
--surface
--surface-1
--surface-2
--color-background
--foreground
--muted
--muted-foreground
--border

/* Intents (Намерения) */
/* Primary */
--intent-primary-main: var(--accent-primary);
--intent-primary-alpha: ...
--intent-primary-text: ...

/* Secondary / Muted */
--intent-secondary-main: var(--muted-foreground);
--intent-secondary-alpha: ...

/* Success (заменит --green-9) */
--intent-success-main: var(--color-success);
--intent-success-alpha: var(--color-success-alpha);
--intent-success-text: ...

/* Error (заменит --red-9, --ruby-9) */
--intent-error-main: var(--color-error);
--intent-error-alpha: var(--color-error-alpha);
--intent-error-text: ...

/* Warning (заменит --amber-*, --orange-*) */
--intent-warning-main: var(--color-warning);
--intent-warning-alpha: var(--color-warning-alpha);
--intent-warning-text: ...

/* Info (заменит --blue-*) */
--intent-info-main: var(--color-info);
--intent-info-alpha: ...
--intent-info-text: ...
```

---

## 4. Пошаговый план внедрения (Рефакторинг)

### Шаг 1: Разделение `index.css` [DONE]
1. Создать новую структуру в `app/src/styles/`.
2. Аккуратно перенести содержимое из старого `index.css` по новым файлам (`tokens/`, `themes/`, `global.css`).
3. В `app/src/index.css` оставить только директивы `@import`.
4. Сохранить блок `/* RADIX-СОВМЕСТИМЫЕ АЛИАСЫ */` в `themes/base.css`, чтобы приложение продолжило работать как есть.

### Шаг 2: Внедрение Intent-токенов в темы [DONE]
В `default.css`, `neon.css`, `emerald.css` прописать значения для всех `intent-*` переменных. Учитывать, что Neon и Emerald имеют свои уникальные статусные цвета (например, `Neon Red`, `Neon Gold`).

### Шаг 3: Миграция CSS Modules (features, components, pages) [DONE]
Пройтись по всем файлам `*.module.css` и произвести замены:
- `var(--accent-9)` ➔ `var(--intent-primary-main)`
- `var(--accent-10)` ➔ `var(--accent-secondary)`
- `var(--slate-4)`, `var(--slate-8)` ➔ `var(--surface-2)` или `var(--border)`
- `var(--blue-3)` ➔ `var(--intent-info-alpha)`
- `var(--blue-11)` ➔ `var(--intent-info-main)`
- `var(--amber-3)` ➔ `var(--intent-warning-alpha)`
- `var(--amber-5)` ➔ `var(--border)`
- `var(--orange-11)`, `var(--orange-9)` ➔ `var(--intent-warning-main)`
- `var(--green-9)` ➔ `var(--intent-success-main)`
- `var(--ruby-9)`, `var(--red-9)` ➔ `var(--intent-error-main)`

Удалить хардкодные fallback-цвета (например, `var(--color-error, #ef4444)` ➔ `var(--color-error)` или `var(--intent-error-main)`).

### Шаг 4: Рефакторинг JS/TS хардкода [DONE]
В файле `app/src/config/settings.ts` заменить строковые цвета `color: "blue" | "aqua" | "red"` на семантические `intent: "info" | "primary" | "error"`. 
Затем в компоненте `SettingsMenu` (`app/src/features/settings/SettingsMenu/index.tsx`) использовать этот `intent` для применения CSS-классов или переменных из CSS Modules, а не передавать через `style={{ color: item.color }}`.

### Шаг 5: Очистка и тестирование [DONE]
1. Удалить `/* RADIX-СОВМЕСТИМЫЕ АЛИАСЫ */` из `themes/base.css`.
2. Провести полное тестирование всех 3-х тем (`Default`, `Neon`, `Emerald`) в светлом и темном режимах.
3. Проверить UI компонентов: кнопки, бейджи, инпуты, страницы чата и профиля.

## Итог [РЕФАКТОРИНГ ПОЛНОСТЬЮ ЗАВЕРШЕН]
После выполнения плана мы получили полностью независимую от внешних библиотек дизайн-систему, работающую исключительно на CSS Modules и стандартизированных CSS-переменных, которая легко поддерживает неограниченное количество кастомных тем.
