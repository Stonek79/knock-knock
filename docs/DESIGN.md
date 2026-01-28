# Дизайн-система Knock-Knock

## 🎨 Цветовая палитра

### Цветовая палитра

Используем [Radix Colors](https://www.radix-ui.com/colors) через CSS-переменные:

#### Light Theme
| Назначение | Переменная | Цвет |
|------------|------------|------|
| **Background** | `var(--color-background)` | White (`#ffffff`) |
| **Surface** | `var(--color-surface)` | White / Slate-1 |
| **Primary** | `var(--blue-9)` | Bright Blue |
| **Text** | `var(--slate-12)` | Very Dark Slate |

#### Dark Theme
| Назначение | Переменная | Цвет |
|------------|------------|------|
| **Background** | `var(--slate-1)` | Very Dark Blue |
| **Surface** | `var(--slate-2)` | Dark Blue |
| **Primary** | `var(--blue-9)` | Bright Blue |
| **Text** | `var(--slate-12)` | White-ish |

Все цвета определены в `index.css` внутри селектора `.radix-themes` для корректного маппинга на токены Radix. Компоненты должны использовать **только** CSS-переменные (например `var(--primary)`), а не hex-коды.

---

## 📐 Типографика

Используем системные шрифты через Radix:

```css
font-family: var(--font-family);
```

### Размеры текста (Radix Text)
| Размер | Использование |
|--------|---------------|
| `size="1"` | Метки времени, подписи |
| `size="2"` | Вторичный текст |
| `size="3"` | Основной текст |
| `size="5"` | Заголовки секций |
| `size="6-8"` | Заголовки страниц |

---

## 📏 Spacing

Используем Radix spacing через пропсы:

```tsx
<Flex gap="3" p="4" m="2">
```

| Значение | Пиксели |
|----------|---------|
| `1` | 4px |
| `2` | 8px |
| `3` | 12px |
| `4` | 16px |
| `5` | 24px |

---

## 🧩 Компоненты

### Radix Themes (приоритет)
- `Flex`, `Box` — лейауты
- `Text`, `Heading` — типографика
- `Button`, `IconButton` — кнопки
- `Dialog`, `AlertDialog` — модалки
- `DropdownMenu` — контекстные меню
- `TextField.Root` — инпуты
- `Avatar`, `Badge`, `Card` — UI элементы

### Кастомные компоненты (`components/ui/`)
- `Alert` — уведомления (обёртка `Callout`)
- `Button` — расширенная кнопка
- `AppLogo` — логотип приложения

### Иконки
**Lucide React** — единственная библиотека иконок.

```tsx
import { MessageSquare, Lock, Settings } from "lucide-react";
<MessageSquare size={20} />
```

---

## 📱 Breakpoints

Mobile First подход:

```css
/* Mobile (default) */
.element { ... }

/* Tablet */
@media (min-width: 769px) { ... }

/* Desktop */
@media (min-width: 1024px) { ... }
```

В коде используем хук:
```tsx
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);
```

---

## ✨ Микро-анимации

Используем CSS transitions:

```css
.element {
    transition: background-color 0.2s ease;
}
```

Основные анимации:
- Hover states: 0.2s
- Page transitions: 0.3s
- Fade in: 0.5s

---

## 🎭 Тени и эффекты

```css
/* Лёгкая тень для карточек */
box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.13);

/* Glassmorphism */
backdrop-filter: blur(10px);
background: rgba(255, 255, 255, 0.1);
```

---

## ❌ Запрещено

1. **Inline styles**: `style={{}}` — всегда CSS Modules
2. **Tailwind**: не используем
3. **Другие иконки**: только Lucide
4. **window.alert/confirm**: только UI компоненты
