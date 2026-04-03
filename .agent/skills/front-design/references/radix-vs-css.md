# Radix UI vs CSS Modules: Гайд по выбору

В проекте Knock-Knock мы сочетаем мощь Radix UI в виде кастомных компонентов для структуры и гибкость CSS Modules для уникального дизайна.

## Не использовать Radix UI Props
Не используйте встроенные пропсы Radix (`p`, `m`, `gap`, `direction`, `align`, `justify`), используем кастомные:
- Выравнивание элементов во флекс-контейнере.
- Системные отступы из сетки (1-9).
- Изменение размеров текста.

**Пример:**
```tsx
<Flex gap="3" align="center" p="4">
  <Avatar src="..." fallback="A" />
  <Text size="2" weight="bold">User Name</Text>
</Flex>
```

## Когда использовать CSS Modules
Используйте CSS Modules (`styles.myClass`), когда:
- Нужны сложные CSS-эффекты (градиентные меши, нестандартные тени, блюр).
- Нужно специфическое поведение при ховере или анимация (`@keyframes`).
- Нужно переопределить глубокие стили компонентов (через селекторы).
- Нужно использовать специфические переменные из `index.css`, которые не прокинуты в пропсы.

**Пример:**
```tsx
// MyComponent.tsx
import styles from './MyComponent.module.css';

<Box className={styles.premiumCard}>
  {/* content */}
</Box>
```

```css
/* MyComponent.module.css */
.premiumCard {
  background: linear-gradient(135deg, var(--surface), var(--muted));
  transition: transform 0.2s ease;
  overflow: hidden;
  position: relative;
}

.premiumCard:hover {
  transform: translateY(-2px);
}
```

## Золотое правило (The Knock-Knock Rule)

1. **Macro-Layout = Radix / Flex / Grid**. Глобальная структура страниц, отступы между крупными блоками. Допустимо использование пропсов (`p`, `m`, `gap`).
2. **Aesthetics & Micro-Layout = CSS Modules + @container**. 
   - Все, что касается внутреннего вида компонента.
   - **Адаптивность компонентов ЗАПРЕЩЕНА через Media Queries.** Используем только `@container`, чтобы компонент был независим от экрана.
3. **Typography = UI Components**. Всегда используем `<Text>` и `<Heading>`.

## Разделение ответственности

| Задача | Инструмент | Почему? |
|---|---|---|
| Сетка страницы | `<Flex>`, `<Grid>` | Быстрота, консистентность отступов |
| Простые состояния | `Propeties`  | Простая стилизация кнопок, стейтов |
| Адаптивный блок | `CSS Modules + @container` | Компонент работает и в Sidebar, и в ленте |
| Специфические стили | `CSS Modules (Изоляция)` | Строго через классы модуля для безопасного управления приоритетом |

## Как НЕ надо делать
- Плохо: `<Flex direction={{ initial: 'column', md: 'row' }}>` -> **Запрещено**. Используй `@container` в CSS-модуле.
- Плохо: Стилизовать через `!important` -> Используй правильную вложенность внутри CSS Modules.
- Плохо: Использовать `@layer` -> Слои вызывают конфликты с Radix UI и сторонним кодом, используй стандартную специфичность CSS Modules.
- Плохо: Прямые HEX цвета -> Только `var(--accent-primary)`.
