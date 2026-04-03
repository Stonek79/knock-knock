# Доработка дизайн-системы Knock-Knock

> **Статус:** 📋 Базовая спецификация
> **Приоритет:** Фундаментальный слой системы
> **Связанные документы:** `DESIGN.md`, `AUTH_STRATEGY.md`

---

## 📋 Содержание

1. [Цель](#цель)
2. [Найденные проблемы](#найденные-проблемы)
3. [Архитектура CSS](#архитектура-css)
4. [Тема `default` — палитра WA-inspired](#тема-default--палитра-wa-inspired)
5. [Порядок реализации](#порядок-реализации)
6. [Roadmap: CSS Architecture v3](#roadmap-css-architecture-v3)

---

## Цель

Привести дизайн-систему в порядок: устранить неопределённые CSS-переменные, добавить тему `default` (WA-inspired), которая будет:

- **Знакомой** — пользователи сразу узнают паттерны интерфейса
- **Мобильной** — Mobile First, привычный мессенджер-дизайн
- **Семантически правильной** — `:root` содержит только статические токены, темы переопределяют только цветовые переменные
- **Поддерживающей оба режима** — Light (по умолчанию) и Dark

---

## Найденные проблемы

### 🔴 Уровень 1: Undeclared CSS-переменные

Переменные используются в компонентах, но **не определены** в `index.css`. Браузер молча их игнорирует — компоненты рендерятся сломанными стилями.

| Переменная | Где используется | Правильное значение |
|---|---|---|
| `--surface` | Button, LandingPage, ContactList, AdminLayout | Основная поверхность (карточки, панели) |
| `--surface-1` | Features, pages | Вторичная поверхность (вложенные блоки) |
| `--surface-2` | Features, pages | Третичная поверхность |
| `--border` | Button (`.surface` variant), AlertDialog, многие фичи | Цвет разделителей |
| `--muted-foreground` | Button (`.secondary` intent) | Приглушённый текст |
| `--radius-glass` | Button (базовый радиус) | Алиас для `--kk-radius-glass` |
| `--space-7` | Несколько компонентов | 28px (пропущенный шаг в системе) |
| `--space-md` | Несколько компонентов | Алиас для `--space-4` (16px) |
| `--color-info` | Features | Информационный цвет |
| `--color-background` | Features | Алиас для `--bg-app` |
| `--text-4xl` | Крупные заголовки | 36px |
| `--size-icon-xl` | Icons в нескольких местах | 40px |
| `--size-avatar-xl-temp` | Avatar component | Алиас для `--size-avatar-xl` |

**Итого:** 13 переменных-«призраков», которые делают стили непредсказуемыми.

---

### 🟡 Уровень 2: Radix-токены без источника

В файлах `pages/` и некоторых компонентах используются токены стиля `--gray-1`, `--gray-12`, `--accent-9` — это было наследие `@radix-ui/themes`, который **удалён из проекта**. Эти переменные нигде не определены.

**Затронутые файлы:**
- `pages/LandingPage/landing.module.css` — `--gray-1`, `--gray-3`, `--gray-8`, `--gray-11`, `--gray-12`
- `pages/ContactsPage/contactspage.module.css` — `--gray-11`, `--gray-12`
- `pages/PrivateChatPage/privatechatpage.module.css` — `--gray-11`, `--gray-12`
- `features/chat/list/ChatList/chatlist.module.css` — `--gray-8`
- `components/ui/PasswordInput/styles.module.css` — `--gray-10`, `--gray-12`

**Решение:** Добавить алиасы в `:root`, которые маппируют Radix-токены на наши семантические переменные. Это позволит не переписывать эти файлы сейчас — они будут работать через алиасы.

---

### 🟡 Уровень 3: `:root` содержит тематические цвета

Текущий `:root` используется как «neon dark по умолчанию» — содержит конкретные синие и циановые цвета. Это значит, что если по какой-то причине тема не применилась, пользователь увидит neon-стили вместо нейтральных.

**Правило:** `:root` должен содержать только **статические токены** (spacing, typography, sizes, z-index), а цвета — только нейтральные безопасные дефолты.

---

### 🟢 Уровень 4: Отсутствует тема `default`

В `DESIGN_THEME.DEFAULT = 'default'` константа объявлена, в `DESIGN_THEMES` включена, но **CSS-блок** `[data-theme="default"]` **не написан**. Тема `default` фактически не существует.

---

### 🟢 Уровень 5: `forwardRef` в компонентах (React 18 → React 19)

`Button` и другие компоненты используют `forwardRef` — паттерн React 18. В React 19.2 `ref` передаётся как обычный проп. Не критично сейчас, но нужно исправить при следующем рефакторинге компонентов.

---

## Архитектура CSS

### Принцип разделения (текущий, после рефакторинга)

```
:root {
  /* ✅ ТОЛЬКО статика: spacing, typography, z-index, sizes, transitions */
  /* ✅ Нейтральные цвета как безопасный fallback */
}

[data-theme="default"] {   /* WA-inspired */
  &[data-mode="light"] { ... }  /* ← дефолтный режим приложения */
  &[data-mode="dark"]  { ... }
}

[data-theme="neon"] {
  &[data-mode="dark"]  { ... }
  &[data-mode="light"] { ... }
}

[data-theme="emerald"] {
  &[data-mode="dark"]  { ... }
  &[data-mode="light"] { ... }
}
```

### Полный список семантических токенов (после рефакторинга)

**Поверхности и фоны:**
| Токен | Описание |
|---|---|
| `--bg-app` | Глобальный фон приложения |
| `--surface` | Основные панели, карточки, sidebar |
| `--surface-1` | Вложенные блоки (чуть другой оттенок) |
| `--surface-2` | Заголовки, navigation bar |
| `--color-background` | Алиас для `--bg-app` (совместимость) |

**Текст:**
| Токен | Описание |
|---|---|
| `--foreground` | Основной текст |
| `--muted` | Вторичный текст (даты, подписи) |
| `--muted-foreground` | Приглушённый (placeholder, hint) |

**Акценты:**
| Токен | Описание |
|---|---|
| `--accent-primary` | Главный акцент |
| `--accent-secondary` | Дополнительный акцент |

**Границы и стекло:**
| Токен | Описание |
|---|---|
| `--border` | Цвет разделителей (1px solid) |
| `--glass-bg` | Полупрозрачный фон (glassmorphism) |
| `--glass-border` | Границы стеклянных элементов |
| `--glass-hover-bg` | Hover-фон |
| `--glass-border-active` | Активная граница |

**Пузыри сообщений:**
| Токен | Описание |
|---|---|
| `--bubble-in` | Фон входящих сообщений |
| `--bubble-in-fg` | Текст входящих |
| `--bubble-out` | Фон исходящих |
| `--bubble-out-fg` | Текст исходящих |

**Статус:**
| Токен | Описание |
|---|---|
| `--color-error` | Ошибки |
| `--color-success` | Успех |
| `--color-warning` | Предупреждение |
| `--color-info` | Информация |
| `--color-error-alpha` | Полупрозрачный фон ошибки |
| `--color-success-alpha` | Полупрозрачный фон успеха |
| `--color-warning-alpha` | Полупрозрачный фон предупреждения |

---

## Тема `default` — палитра WA-inspired

### Light Mode (дефолтный режим приложения)

| Токен | Значение | Описание |
|---|---|---|
| `--bg-app` | `#f0f2f5` | Серо-белый фон (характерный WA паттерн) |
| `--surface` | `#ffffff` | Белые панели (боковая панель, карточки) |
| `--surface-1` | `#f0f2f5` | Фон за элементами |
| `--surface-2` | `#e9edef` | Заголовки, тулбары |
| `--border` | `#e9edef` | Разделители |
| `--foreground` | `#111b21` | Основной текст |
| `--muted` | `#667781` | Вторичный текст (`--text-secondary` из WA) |
| `--muted-foreground` | `#8696a0` | Placeholder, hints |
| `--accent-primary` | `#00a884` | WA зелёный (современный) |
| `--accent-secondary` | `#008069` | WA тёмно-зелёный (`--text-action` из WA) |
| `--glass-bg` | `rgba(255,255,255,0.92)` | Стеклянные панели |
| `--glass-border` | `#e9edef` | Границы |
| `--glass-hover-bg` | `rgba(0,168,132,0.08)` | Зелёноватый hover |
| `--bubble-in` | `#ffffff` | Входящие сообщения — белые |
| `--bubble-in-fg` | `#111b21` | — |
| `--bubble-out` | `#d9fdd3` | Исходящие — светло-зелёные |
| `--bubble-out-fg` | `#111b21` | — |
| `--color-error` | `#ea0038` | WA red (`--button-secondary-destructive`) |
| `--color-success` | `#00a884` | WA зелёный |
| `--color-warning` | `#ffbc38` | WA warning yellow |
| `--color-info` | `#009de2` | WA info blue (`--attachment-type-contacts`) |

### Dark Mode

| Токен | Значение | Описание |
|---|---|---|
| `--bg-app` | `#111b21` | Очень тёмный синевато-чёрный |
| `--surface` | `#202c33` | Панели (чуть светлее) |
| `--surface-1` | `#2a3942` | Вложенные поверхности |
| `--surface-2` | `#182229` | Заголовки, navigation |
| `--border` | `#2a3942` | Разделители |
| `--foreground` | `#e9edef` | Основной текст |
| `--muted` | `#8696a0` | Вторичный (`--poll-checkbox` из WA) |
| `--muted-foreground` | `#667781` | Приглушённый |
| `--accent-primary` | `#00a884` | Тот же зелёный |
| `--accent-secondary` | `#008069` | — |
| `--glass-bg` | `rgba(32,44,51,0.92)` | — |
| `--glass-border` | `#2a3942` | — |
| `--glass-hover-bg` | `rgba(0,168,132,0.12)` | — |
| `--bubble-in` | `#202c33` | Тёмно-синий |
| `--bubble-in-fg` | `#e9edef` | — |
| `--bubble-out` | `#005c4b` | Тёмно-зелёный |
| `--bubble-out-fg` | `#e9edef` | — |
| `--color-error` | `#ea0038` | — |
| `--color-success` | `#00a884` | — |
| `--color-warning` | `#ffbc38` | — |
| `--color-info` | `#009de2` | — |

### Типографика (WA Web)

Шрифт: `Helvetica Neue, Helvetica, Arial, -apple-system, system-ui, sans-serif`

Для iOS: `SF Pro Text, SF Pro Icons, system, -apple-system, ...`

Шкала размеров (WA-aligned):
- Кнопки, навигация: **16px / weight 500 / line-height 1.0**
- Заголовок контакта: **18px / weight 500 / letter-spacing -0.18px**
- Основной текст: **14px / weight 400**
- Время, подписи: **12px / line-height 1.3 / letter-spacing -0.12px**

Интервалы (WA spacing system, base 8px): `3, 4, 6, 8, 12, 14, 20, 48px`

---

## Порядок реализации

### Шаг 1: Исправление `:root` (не ломаем ничего)

Добавляем недостающие переменные с нейтральными значениями:
- `--space-7: calc(28px * var(--scale-factor))` — пропущенный шаг
- `--space-md: var(--space-4)` — алиас
- `--text-4xl: 36px` — пропущенный размер
- `--size-icon-xl: calc(40px * var(--scale-factor))` — пропущенный размер
- `--size-avatar-xl-temp: var(--size-avatar-xl)` — алиас
- `--radius-glass: var(--kk-radius-glass)` — алиас (совместимость)
- Нейтральные дефолты для `--surface`, `--border`, `--muted-foreground`, `--color-info`, `--color-background`

### Шаг 2: Radix-совместимые алиасы в `:root`

```css
/* Алиасы для совместимости с файлами, использующими Radix-токены */
--gray-1:   var(--bg-app);
--gray-3:   var(--surface-1);
--gray-8:   var(--muted-foreground);
--gray-10:  var(--muted);
--gray-11:  var(--muted);
--gray-12:  var(--foreground);
--accent-9: var(--accent-primary);
--accent-10: var(--accent-secondary);
--accent-11: var(--foreground);
```

### Шаг 3: Добавление `[data-theme="default"]` блока

Полный CSS-блок со всеми семантическими переменными для light и dark режимов.

### Шаг 4: Обновление `neon` и `emerald`

Добавить в каждый блок новые переменные: `--surface`, `--surface-1`, `--surface-2`, `--border`, `--muted-foreground`, `--color-info`, `--color-background`.

### Шаг 5: Обновление store и констант

- `stores/theme/index.ts`: дефолтная тема `default`, дефолтный mode `light`
- `lib/constants/theme.ts`: добавить preview-данные для default темы

### Шаг 6: Документация и skill

- Обновить `DESIGN.md` (добавить тему default, подчеркнуть новые токены)
- Обновить `SKILL.md` (указать default как основную тему)

---

## Roadmap: CSS Architecture v3

> 🟢 **Статус:** Внедрение (Текущий стандарт)
> **Ключевой принцип:** Полная изоляция и независимость компонентов от глобального контекста.

### 1. Архитектура без CSS Layers (Обновлено)
В ходе тестов было принято решение **ОТКАЗАТЬСЯ от использования `@layer`**. 
- **Причина:** Не-слоистый CSS всегда имеет приоритет над слоистым, что вызывает непредсказуемые перекрытия стилей с базовыми компонентами Radix и сторонними библиотеками.
- **Новый стандарт:** Используем плоскую структуру `index.css` (только `:root` и классы тем) в связке со стандартной изоляцией CSS Modules для компонентов.

### 2. Container Queries — Стандарт Адаптивности
Вместо `@media (max-width: ...)` для компонентов используется `@container`.
- **Зачем?** Компонент должен подстраивать свой вид под размер родителя (например, в Sidebar или в ленте), а не под весь экран.
- **Правило:** Макетные изменения внутри модулей (скрытие текста, переход к карусели) реализуются через `@container (max-width: 450px)`.

### 3. Component-Level Tokens (Изоляция)
Компоненты не должны напрямую использовать глобальные токены темы в `background` или `color`.
**Паттерн:**
```css
.card {
  /* 1. Объявляем локальные переменные (api компонента) */
  --card-bg: var(--surface);
  --card-text: var(--foreground);

  /* 2. Используем локальные переменные */
  background: var(--card-bg);
  color: var(--card-text);
}
```
Это позволяет переопределять вид компонента извне, не залезая в его CSS, просто перекрыв `--card-bg`.

### 4. Layout Constraints
Для улучшения читаемости на сверхшироких мониторах (21:9 и более) основные контентные области (Settings, Profile, Chat Info) ограничиваются:
- `--max-w-settings: 1200px;`
- Центрирование через `margin: 0 auto;`
