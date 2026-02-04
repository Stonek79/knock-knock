---
name: front-design
description: Создание высококачественных интерфейсов в стиле "Mobile First" для проекта Knock-Knock. Используйте этот навык при разработке компонентов, страниц или рефакторинге UI. Скилл гарантирует соблюдение архитектуры (React 19, Radix UI Themes), использование CSS-переменных из index.css, правильную работу с темами (Dark/Light) и Mobile-First верстку. Генерирует уникальный, премиальный дизайн, избегая стандартных "AI-шаблонов", сохраняя при этом чистоту кода проекта.
---

# Front Design (Knock-Knock Edition)

Этот навык предназначен для создания эстетичных, производительных и архитектурно правильных интерфейсов для мессенджера Knock-Knock.

## Основные принципы (Knock-Knock Core)

1.  **Mobile First**: Любой интерфейс сначала проектируется для мобильного экрана. Desktop-версия является адаптивным расширением.
2.  **Radix UI Themes First**: Используйте примитивы Radix (`<Flex>`, `<Box>`, `<Text>`, `<Container>`, `<Section>`) для построения разметки. Избегайте использования `div` для лейаутов.
3.  **Единый источник истины (Tokens)**: Используйте CSS-переменные, определенные в `app/src/index.css`.
4.  **Никаких инлайн-стилей**: Стилизация выполняется через пропсы Radix или CSS Modules.
5.  **Internationalization (i18n)**:
    *   **No Hardcode**: Текст в UI никогда не пишется хардкодом.
    *   **Используй хук**: `const { t } = useTranslation();` -> `t('auth.login.title')`.
    *   **Приоритет**: Русский язык — база, Английский — второй.
    *   **Нейминг ключей**: Используй семантическую вложенность (`page.component.element`).
6.  **Темизация**: Интерфейс должен идеально выглядеть как в светлой, так и в темной теме, используя семантические переменные (например, `--main-background`, `--foreground`).

## Дизайн-система и токены

При написании стилей или компонентов ВСЕГДА обращайтесь к переменным из `index.css`:

### Цвета и семантика
- `--primary`: Основной акцентный цвет (обычно `blue-9`).
- `--background`: Фон приложения.
- `--surface`: Цвет панелей и карточек.
- `--destructive`: Цвета для ошибок и удаления.

### Отступы (Spacing)
Используйте системные переменные для консистентности:
- `--space-xs` (8px), `--space-sm` (12px), `--space-md` (16px), `--space-lg` (24px) и т.д.

### Типографика
Используйте `var(--font-sans)` и системные размеры:
- `--text-sm` (14px), `--text-base` (16px), `--text-lg` (18px) и т.д.

## Правила реализации

### 1. Верстка лейаутов
Используйте Radix UI компоненты для структуры:
```tsx
import { Flex, Box, Text, Button } from '@radix-ui/themes';
import styles from './MyComponent.module.css';

export const MyComponent = () => (
  <Flex direction="column" gap="3" className={styles.container}>
    <Box>
      <Text size="5" weight="bold">Заголовок</Text>
    </Box>
    {/* Контент */}
  </Flex>
);
```

### 2. CSS Modules
Если пропсов Radix недостаточно, используйте CSS Modules. Внутри модулей можно обращаться к глобальным переменным:
```css
/* MyComponent.module.css */
.container {
  padding: var(--space-md);
  background: var(--surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}
```

### 3. Анимации
Используйте CSS-анимации для микровзаимодействий. Для сложных переходов страниц используйте возможности TanStack Router. Оставляйте анимации легкими, чтобы не блокировать основной поток (важно для криптографии).

## Чего следует ИЗБЕГАТЬ
- **Generic AI Style**: Стандартные фиолетовые градиенты на белом фоне.
- **Инлайн-стили**: `style={{ marginTop: '10px' }}` — запрещено.
- **div-soup**: Использование `div` там, где подходит `Flex` или `Box`.
- **Жесткие значения**: Не пишите `16px`, пишите `var(--space-md)`.

## Референсы
- [Radix UI vs CSS Modules](references/radix-vs-css.md) — когда и что использовать.
- [Mobile-First Patterns](references/mobile-patterns.md) — паттерны для мессенджера.
- [Theming & Colors](references/theming.md) — глубокая работа с темами.
