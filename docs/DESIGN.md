# Дизайн-система Knock-Knock

> Базовый стандарт оформления

---

## 🏗️ Архитектурный принцип

Knock-Knock использует **кастомную дизайн-систему поверх Radix UI**.

### Правило слоёв

```
features/ pages/          ← импортируют ТОЛЬКО из @/components/ui
      ↓
components/ui/            ← наши обёртки: Text, Heading, Avatar, Button...
      ↓
@radix-ui                 ← используется ТОЛЬКО внутри components/ui/
      ↓
index.css                 ← единственный источник всех токенов (@layer tokens)
```

### Принцип управления стилями

Для управления стилями и предотвращения конфликтов со стилями библиотек (Radix, PocketBase UI) мы **избегаем использования `@layer`** (из-за проблем специфичности при смешивании со сторонним кодом) и опираемся на стандартную изоляцию:
- **Глобальные токены**: `index.css` содержит только `:root`, `body` и переменные тем (`[data-theme="..."]`).
- **Компоненты**: Изолированы через CSS Modules (`.module.css`). Специализация контролируется классами, а не порядком слоев.

### Почему так?

Radix UI имеет собственную систему пропсов (`color="gray"`, `size="1"`, `radius="full"`),
которая **не реагирует** на наши CSS-переменные и `--scale-factor`.
Оборачивая Radix-компоненты, мы:
- Управляем стилями через наши токены (`--muted`, `--color-error`, `--text-sm`)
- Гарантируем реакцию на смену темы и масштаба
- Имеем единый источник правды

### Почему семантические пропсы? (Подход Telegram)

Использование пропсов компонента (например, `size="md"`, `intent="primary"`) — это основа любой гибкой дизайн-системы, поддерживающей динамическую кастомизацию "на лету" (как масштабирование шрифтов или смена цветовых палитр в Telegram).

**Архитектурный принцип:**
1. **React-пропсы задают семантику, а не жесткие значения.** Контейнер говорит «сделай текст большим» (`size="lg"`), а не `size="24px"`.
2. Компонент мапит этот пропс на CSS-класс: `className={clsx(styles.text, styles[size])}`.
3. CSS-класс использует CSS-переменную: `.lg { font-size: var(--text-lg); }`.

**Как реализуется динамическое изменение стилей пользователем:**
При изменении настроек приложения (выбор крупного шрифта, или другой темы) мы **не трогаем React-дерево** и не перерендериваем миллион компонентов. Мы просто меняем глобальные CSS-переменные на корневом элементе:

```css
/* Базовый масштаб (по умолчанию) */
:root {
    --scale-factor: 1;
    --text-base: calc(var(--text-base) * var(--scale-factor));
    --text-lg: calc(var(--text-lg) * var(--scale-factor));
}

/* Пользователь выбрал в настройках "Крупный шрифт" */
body[data-text-scale="large"] {
    --scale-factor: 1.2;
    /* Теперь все компоненты <Text size="base"> мгновенно станут 19.2px, а <Text size="lg"> станут 21.6px по всему приложению! */
}
```

Такой же подход используется для изменения цветовых палитр. Пропс `intent="primary"` мапится на `var(--accent-primary)`, который можно динамически переопределить на уровне `body[data-theme="emerald"]`.

---

## 📦 Компоненты UI (`components/ui/`)

### Структурные (layout) — импортировать напрямую из Radix только там, где это оправдано и нет кастомных обёрток


```tsx
import { Flex, Box, Grid, Container } from "@/components/layout";
```

### Стилизующие — ТОЛЬКО через наши обёртки `@/components/ui`

| Наш компонент | Radix-основа | Ключевые пропсы |
|---------------|-------------|-----------------|
| `Text` | `Text` | `variant`, `size`, `align` |
| `Heading` | `Heading` | `level`, `size` |
| `Button` | нативный `<button>` | `variant`, `size` |
| `IconButton` | `IconButton` | `variant`, `size` |
| `Avatar` | `Avatar` | `size`, `name` |
| `Badge` | `Badge` | `variant` |
| `Spinner` | `Spinner` | `size` |
| `Card` | `Card` | `variant` |
| `TextField` | `TextField` | `size` |
| `TextArea` | `TextArea` | `size` |
| `Alert` | `Callout` | `variant` |
| `AppLogo` | нативный `<span>` | `size` |

### Пример использования

```tsx
// ✅ Правильно — наши обёртки
import { Text, Heading, Button, Avatar } from "@/components/ui";

<Text variant="muted" size="sm">Подпись</Text>
<Text variant="error" size="xs">Ошибка валидации</Text>
<Heading level={2} size="lg">Заголовок</Heading>
<Avatar size="md" name="Иван" src={url} />
<Button variant="solid" size="md">Отправить</Button>

// ❌ Запрещено в features/ и pages/
import { Text } from "@radix-ui";
<Text color="gray" size="1">...</Text>
```

---

## 🎨 Цветовая палитра и Темы

Knock-Knock поддерживает темы **Default**, **Neon** и **Emerald** в режимах **Dark** и **Light**.
Все цвета — CSS-переменные в `src/index.css`, переключаются через `data-theme` и `data-mode`.

### Темы проекта

| Тема | data-theme | Light | Dark | Назначение |
|-------|-----------|-------|------|------------|
| **Default** ⭐ | `default` | Белый / #f0f2f5 | #111b21 | WA-inspired, дефольтная тема |
| **Neon** | `neon` | Arctic Glass | Cosmic Cyberpunk | Киберпанк, голография |
| **Emerald** | `emerald` | Mint Sage | Forest Gold | VIP, золото, природа |

Дефолт при первом запуске: `default` / `light`.

### Тема `default` (WA-inspired)

Палитра вдохновлена интерфейсом WhatsApp Web — пользователи сразу узнают паттерны:

| Режим | Фон приложения | Панели | Акцент | Исходящие |
|-------|------|--------|--------|----------|
| Light | `#f0f2f5` | `#ffffff` | `#00a884` | `#d9fdd3` |
| Dark | `#111b21` | `#202c33` | `#00a884` | `#005c4b` |

Подробная палитра и порядок реализации: `DESIGN_SYSTEM_PLAN.md`

### Семантические токены цвета

| Токен | Описание |
|-------|----------|
| `--bg-app` | Глобальный фон приложения |
| `--surface` | Основные панели и карточки |
| `--surface-1` | Вложенные блоки (secondary) |
| `--surface-2` | Заголовки, навигационные бары |
| `--foreground` | Основной цвет текста и иконок |
| `--muted` | Второстепенный текст (даты, подписи) |
| `--muted-foreground` | Приглушённый текст (placeholder, hint) |
| `--accent-primary` | Главный акцент |
| `--accent-secondary` | Дополнительный акцент |
| `--border` | Цвет разделителей (1px solid) |
| `--glass-bg` | Полупрозрачный фон (glassmorphism) |
| `--glass-border` | Границы стеклянных элементов |
| `--glass-hover-bg` | Фон при наведении |
| `--bubble-in` | Фон входящих сообщений |
| `--bubble-in-fg` | Текст входящих сообщений |
| `--bubble-out` | Фон исходящих сообщений |
| `--bubble-out-fg` | Текст исходящих сообщений |

### Статусные токены

| Токен | Описание |
|-------|----------|
| `--color-error` | Ошибки, деструктивные действия |
| `--color-error-alpha` | Полупрозрачный фон ошибки |
| `--color-success` | Успех, онлайн-статус |
| `--color-success-alpha` | Полупрозрачный фон успеха |
| `--color-warning` | Предупреждения |
| `--color-warning-alpha` | Полупрозрачный фон предупреждения |
| `--color-info` | Информационные сообщения |

---


## 📐 Типографика

### Токены размеров текста

| Токен | Значение | Семантика |
|-------|----------|-----------|
| `--text-xs` | 12px | Метки времени, мелкие подписи |
| `--text-sm` | 14px | Вторичный текст, подписи |
| `--text-base` | 16px | Основной текст |
| `--text-lg` | 18px | Увеличенный текст |
| `--text-xl` | 20px | Подзаголовки |
| `--text-2xl` | 24px | Заголовки секций |
| `--text-3xl` | 30px | Крупные заголовки |

### Токены начертания

| Токен | Значение |
|-------|----------|
| `--font-weight-normal` | 400 |
| `--font-weight-medium` | 500 |
| `--font-weight-bold` | 700 |
| `--font-weight-black` | 900 |

### Использование в компоненте `Text`

```tsx
// Варианты (variant) — управляют цветом
<Text variant="default">Основной текст</Text>
<Text variant="muted">Второстепенный текст</Text>
<Text variant="error">Текст ошибки</Text>
<Text variant="warning">Предупреждение</Text>
<Text variant="success">Успех</Text>

// Размеры (size) — управляют font-size
<Text size="xs">Мелкий</Text>
<Text size="sm">Маленький</Text>
<Text size="base">Базовый</Text>
<Text size="lg">Большой</Text>

// Начертание (weight)
<Text weight="medium">Средний</Text>
<Text weight="bold">Жирный</Text>
```

---

## 📏 Spacing

Radix spacing-пропсы (`gap`, `p`, `m`) допустимы на структурных компонентах (`Flex`, `Box`):

```tsx
<Flex gap="3" p="4" align="center">
```

| Значение | Пиксели |
|----------|---------|
| `1` | 4px |
| `2` | 8px |
| `3` | 12px |
| `4` | 16px |
| `5` | 20px |
| `6` | 24px |

В CSS-модулях — только через токены:

```css
.element {
    padding: var(--space-4);
    gap: var(--space-3);
}
```

---

## 🖼️ Иконки

**Lucide React** — единственная библиотека иконок.

### Токены размеров иконок

| Токен | Значение | Использование |
|-------|----------|---------------|
| `--size-icon-xs` | 14px | Чипы, мелкие элементы |
| `--size-icon-sm` | 18px | Навигация, кнопки |
| `--size-icon-md` | 24px | Основные иконки |
| `--size-icon-lg` | 32px | Пустые состояния |

```tsx
// ✅ Правильно
<Search className={styles.search} />
<Trash2 className={styles.trash2} />

// ❌ Запрещено
<Search size={16} />
<Search size="var(--size-icon-xs)" />  // ← тоже запрещено в JSX, только в CSS
```

---

## 🖼️ Аватары

| Токен | Значение | Radix size |
|-------|----------|------------|
| `--size-avatar-sm` | 32px | `size="sm"` |
| `--size-avatar-md` | 40px | `size="md"` |
| `--size-avatar-lg` | 80px | `size="lg"` |

```tsx
// ✅ Правильно — наш Avatar
import { Avatar } from "@/components/ui";
<Avatar size="md" name="Иван" src={url} />

// ❌ Запрещено (прямое использование примитивов)
import * as AvatarPrimitive from "@radix-ui/react-avatar";
<AvatarPrimitive.Root>...</AvatarPrimitive.Root>
```

---

## 📱 Адаптивность и Breakpoints (Mobile First)

В Knock-Knock используется гибридный подход: **Global Breakpoints** для макета и **Container Queries** для компонентов.

### Global Media Queries (Layout)
Используются для глобальных изменений (скрытие Sidebar, изменение навигации).

```css
/* Mobile (default) */
.element { ... }

/* Tablet */
@media (min-width: 769px) { ... }

/* Desktop Max-Width Constraint */
@media (min-width: 1200px) {
    .settingsContainer {
        max-width: var(--max-w-settings, 1200px);
        margin: 0 auto;
    }
}
```

### Container Queries (Components) ⭐ 
**Предпочтительный метод** для всех новых UI-компонентов. Компонент адаптируется под размер своего родителя.

```css
.cardContainer {
    container-type: inline-size;
}

@container (max-width: 450px) {
    .cardContent {
        flex-direction: column;
    }
}
```


```tsx
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);
```

---

## ✨ Анимации и переходы

| Токен | Значение | Использование |
|-------|----------|---------------|
| `--transition-fast` | 0.15s ease | Hover мелких элементов |
| `--transition-base` | 0.2s ease | Стандартные переходы |
| `--transition-slow` | 0.3s ease | Страничные переходы |

---

## ❌ Запрещено

1. **Inline styles** (`style={{}}`, `style='var(--size-icon-sm)'`) — всегда CSS Modules (`className={styles.icon}`)
2. **Tailwind** — не используем
3. **Другие иконки** — только Lucide React
4. **window.alert/confirm** — только UI компоненты
5. **Хардкодные px-размеры** — только CSS-токены (`var(--size-icon-sm)`)
6. **@radix-ui/themes** — полностью удален из проекта (Headless Architecture), его установка и использование строго запрещены.
7. **Прямой импорт Radix-примитивов** в `features/` и `pages/`:
   ```tsx
   // ❌ Запрещено в features/ и pages/ (только через обертки)
   import * as DialogPrimitive from "@radix-ui/react-dialog";
   
   // ✅ Правильно
   import { Dialog, Button, Avatar } from "@/components/ui";
   ```
8. **HEX-значения в CSS-модулях** — вместо `color: #00a884` писать `color: var(--accent-primary)`.

---

## 🚀 Roadmap: CSS Architecture v3

> **Статус:** 🟢 Внедрение (Текущий стандарт). Подробнее: `DESIGN_SYSTEM_PLAN.md`

1. **Container Queries**: Основной инструмент адаптивности внутри компонентов для независимости от экрана (например, смена ориентации контента).
2. **Component Encapsulation**: Использование локальных CSS-переменных внутри модулей.
4. **Layout Constraints**: Ограничение ширины контента до 1200px для десктопов.
